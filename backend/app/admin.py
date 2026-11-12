"""Fungsi pengelolaan kelas (dipakai oleh tools/create_classroom.py dan pengujian)."""

import re

from sqlmodel import Session, select

from backend.app.models import Classroom
from backend.app.schemas import CLASS_CODE
from backend.app.security import hash_password

MIN_PASSWORD_LENGTH = 8


def normalize_code(code: str) -> str:
    return code.strip().upper()


def create_classroom(
    session: Session, code: str, name: str, password: str, research: bool = False
) -> Classroom:
    code = normalize_code(code)
    if not re.fullmatch(CLASS_CODE, code):
        raise ValueError("Kode kelas hanya boleh huruf, angka, dan tanda hubung (2–20 karakter).")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Kata sandi minimal {MIN_PASSWORD_LENGTH} karakter.")
    if session.exec(select(Classroom).where(Classroom.code == code)).first():
        raise ValueError(f"Kelas dengan kode {code} sudah ada.")
    classroom = Classroom(
        code=code, name=name.strip(), password_hash=hash_password(password), research=research
    )
    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom
