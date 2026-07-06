from fastapi import APIRouter, HTTPException

from app.services import languages

router = APIRouter(prefix="/languages", tags=["languages"])


@router.get("")
async def list_languages():
    return {
        "languages": [
            {**lang, "styleCount": len(languages.registry()["styles"].get(lang["code"], []))}
            for lang in languages.all_languages()
        ]
    }


@router.get("/{code}/styles")
async def language_styles(code: str):
    if not languages.is_supported(code):
        raise HTTPException(404, f"Language '{code}' not supported")
    return {"code": code, "styles": languages.styles_for(code),
            "default": languages.default_style(code)}
