import logging
import os
import tempfile

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import UploadFile
from google.cloud import vision
from langchain_community.document_loaders import UnstructuredURLLoader
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredWordDocumentLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import CharacterTextSplitter

load_dotenv()
logging.basicConfig(level=logging.INFO)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
INDEX_NAME = os.environ.get("INDEX_NAME")

vectorstore = PineconeVectorStore(
    index_name=INDEX_NAME,
    embedding=embeddings
)


def ingest_uploaded_file_to_knowledge_base(file: UploadFile, user_id: int):
    ext = os.path.splitext(file.filename)[-1].lower()

    if ext not in [".pdf", ".txt", ".docx", ".jpg", ".jpeg", ".png"]:
        raise Exception(f"Unsupported file type: {ext}")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            file_bytes = file.file.read()
            tmp_file.write(file_bytes)
            tmp_path = tmp_file.name
    except Exception:
        raise Exception("Could not write uploaded file to temp file")

    loader = None
    documents = None

    try:
        if ext == ".pdf":
            loader = PyPDFLoader(tmp_path)
        elif ext == ".txt":
            loader = TextLoader(tmp_path)
        elif ext == ".docx":
            loader = UnstructuredWordDocumentLoader(tmp_path)
        elif ext in [".jpg", ".jpeg", ".png"]:
            ocr_text = extract_text_from_image(tmp_path)
            documents = [Document(page_content=ocr_text, metadata={})]

        if ext not in [".jpg", ".jpeg", ".png"]:
            documents = loader.load()
    except Exception as e:
        os.remove(tmp_path)
        raise Exception(f"Error loading file: {str(e)}")

    splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["user_id"] = user_id
        chunk.metadata["filename"] = file.filename

    try:
        vectorstore.add_documents(chunks)
    except Exception as e:
        raise Exception("Vectorstore error")

    os.remove(tmp_path)


def extract_text_from_image(image_path: str) -> str:
    try:
        client = vision.ImageAnnotatorClient()
        with open(image_path, "rb") as image_file:
            content = image_file.read()

        image = vision.Image(content=content)
        response = client.text_detection(image=image)

        if response.error.message:
            raise Exception(f"OCR error: {response.error.message}")

        text = response.full_text_annotation.text.strip()
        if not text:
            raise Exception("OCR failed: empty result")

        return text
    except Exception:
        raise Exception("OCR unknown error")


def ingest_url_to_knowledge_base(url: str, user_id: int):
    try:
        loader = UnstructuredURLLoader(urls=[url])
        documents = loader.load()

        if not documents or not documents[0].page_content.strip():
            raise ValueError("Empty content from Unstructured loader")
    except Exception:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "lxml")

            text = soup.get_text(separator="\n", strip=True)
            if not text:
                raise ValueError("Empty content from fallback")
            documents = [Document(page_content=text, metadata={})]
        except Exception as fallback_error:
            raise Exception(f"Failed to extract content from URL: {str(fallback_error)}")

    splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["user_id"] = user_id
        chunk.metadata["filename"] = url

    try:
        vectorstore.add_documents(chunks)
    except Exception:
        raise Exception("Vectorstore error during URL ingestion")


def delete_file_embeddings(user_id: int, filename: str):
    try:
        vectorstore._index.delete(
            filter={
                "user_id": {"$eq": user_id},
                "filename": {"$eq": filename}
            }
        )
    except Exception as e:
        return f"Error: {str(e)}"
