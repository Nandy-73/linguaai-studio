from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org_role, require_project_role
from app.models import Character, Membership, Voice
from app.models.voice import SPEAKER_CATEGORIES
from app.schemas.voice import CharacterCreate, CharacterOut, VoiceCreate, VoiceOut
from app.services import storage

router = APIRouter(tags=["voices"])


@router.get("/orgs/{org_id}/voices", response_model=list[VoiceOut])
async def list_voices(org_id: str, _: Membership = Depends(require_org_role("viewer")),
                      db: AsyncSession = Depends(get_db)):
    return (
        await db.execute(select(Voice).where(Voice.org_id == org_id)
                         .order_by(Voice.created_at.desc()))
    ).scalars().all()


@router.post("/orgs/{org_id}/voices", response_model=dict, status_code=201)
async def create_voice(org_id: str, body: VoiceCreate,
                       _: Membership = Depends(require_org_role("admin")),
                       db: AsyncSession = Depends(get_db)):
    if body.category not in SPEAKER_CATEGORIES:
        raise HTTPException(422, f"category must be one of {SPEAKER_CATEGORIES}")
    if body.kind == "cloned" and not body.consent_granted:
        raise HTTPException(422, "Voice cloning requires explicit consent attestation")
    voice = Voice(org_id=org_id, name=body.name, kind=body.kind, engine=body.engine,
                  category=body.category, language_coverage=body.language_coverage,
                  consent_status="granted" if body.consent_granted else "none")
    db.add(voice)
    await db.flush()
    upload_url = None
    if body.kind == "cloned":
        voice.ref_storage_key = f"voices/{org_id}/{voice.id}/reference.wav"
        upload_url = storage.presign_put(voice.ref_storage_key, "audio/wav")
    await db.commit()
    return {"voice": VoiceOut.model_validate(voice).model_dump(), "reference_upload_url": upload_url}


@router.post("/orgs/{org_id}/voices/{voice_id}/revoke-consent", status_code=200)
async def revoke_consent(org_id: str, voice_id: str,
                         _: Membership = Depends(require_org_role("admin")),
                         db: AsyncSession = Depends(get_db)):
    voice = await db.get(Voice, voice_id)
    if voice is None or voice.org_id != org_id:
        raise HTTPException(404, "Voice not found")
    voice.consent_status = "revoked"
    if voice.ref_storage_key:
        storage.delete_prefix(f"voices/{org_id}/{voice.id}/")
        voice.ref_storage_key = None
    await db.commit()
    return {"id": voice.id, "consent_status": voice.consent_status}


@router.delete("/orgs/{org_id}/voices/{voice_id}", status_code=204)
async def delete_voice(org_id: str, voice_id: str,
                       _: Membership = Depends(require_org_role("admin")),
                       db: AsyncSession = Depends(get_db)):
    voice = await db.get(Voice, voice_id)
    if voice is None or voice.org_id != org_id:
        raise HTTPException(404, "Voice not found")
    storage.delete_prefix(f"voices/{org_id}/{voice.id}/")
    await db.delete(voice)
    await db.commit()


@router.get("/projects/{project_id}/characters", response_model=list[CharacterOut])
async def list_characters(access=Depends(require_project_role("viewer")),
                          db: AsyncSession = Depends(get_db)):
    project, _ = access
    return (
        await db.execute(select(Character).where(Character.project_id == project.id))
    ).scalars().all()


@router.post("/projects/{project_id}/characters", response_model=CharacterOut, status_code=201)
async def create_character(body: CharacterCreate,
                           access=Depends(require_project_role("editor")),
                           db: AsyncSession = Depends(get_db)):
    project, _ = access
    if body.category not in SPEAKER_CATEGORIES:
        raise HTTPException(422, f"category must be one of {SPEAKER_CATEGORIES}")
    if body.voice_id:
        voice = await db.get(Voice, body.voice_id)
        if voice is None or voice.org_id != project.org_id:
            raise HTTPException(404, "Voice not found")
        if voice.kind == "cloned" and voice.consent_status != "granted":
            raise HTTPException(409, "Voice has no valid consent record")
    character = Character(project_id=project.id, **body.model_dump())
    db.add(character)
    await db.commit()
    return character


@router.patch("/projects/{project_id}/characters/{character_id}", response_model=CharacterOut)
async def update_character(character_id: str, body: CharacterCreate,
                           access=Depends(require_project_role("editor")),
                           db: AsyncSession = Depends(get_db)):
    project, _ = access
    character = await db.get(Character, character_id)
    if character is None or character.project_id != project.id:
        raise HTTPException(404, "Character not found")
    for field, value in body.model_dump().items():
        setattr(character, field, value)
    await db.commit()
    return character
