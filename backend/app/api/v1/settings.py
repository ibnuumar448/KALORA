from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.api.deps import RequireRole
from app.models.admission import AdmissionNumberConfig
from app.models.settings import GlobalSetting

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingItem(BaseModel):
    key: str
    value: str

class SettingsUpdate(BaseModel):
    settings: List[SettingItem]

@router.get("", response_model=List[SettingItem])
def get_settings(db: Session = Depends(get_db), current_user = Depends(RequireRole(["super_admin"]))):
    config = db.query(AdmissionNumberConfig).filter(AdmissionNumberConfig.cohort_id == None).first()
    if not config:
        config = AdmissionNumberConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
        
    prefix = f"{config.prefix}{config.separator}{config.year_code}{config.separator}"
    
    # Passing score
    ps_setting = db.query(GlobalSetting).filter(GlobalSetting.key == "passing_score_threshold").first()
    ps_val = ps_setting.value if ps_setting else "60"
    
    mc_setting = db.query(GlobalSetting).filter(GlobalSetting.key == "mentor_capacity").first()
    mc_val = mc_setting.value if mc_setting else "10"
    
    cp_setting = db.query(GlobalSetting).filter(GlobalSetting.key == "capacity_enforcement_policy").first()
    cp_val = cp_setting.value if cp_setting else "warning"
    
    return [
        SettingItem(key="admission_prefix", value=prefix),
        SettingItem(key="passing_score_threshold", value=ps_val),
        SettingItem(key="mentor_capacity", value=mc_val),
        SettingItem(key="capacity_enforcement_policy", value=cp_val)
    ]

@router.post("")
def update_settings(update_data: SettingsUpdate, db: Session = Depends(get_db), current_user = Depends(RequireRole(["super_admin"]))):
    for item in update_data.settings:
        if item.key == "admission_prefix":
            config = db.query(AdmissionNumberConfig).filter(AdmissionNumberConfig.cohort_id == None).first()
            if not config:
                config = AdmissionNumberConfig()
                db.add(config)
                
            parts = item.value.split("/")
            if len(parts) >= 2:
                config.prefix = parts[0]
                config.separator = "/"
                config.year_code = parts[1]
        elif item.key in ["passing_score_threshold", "mentor_capacity", "capacity_enforcement_policy"]:
            setting = db.query(GlobalSetting).filter(GlobalSetting.key == item.key).first()
            if setting:
                setting.value = item.value
            else:
                db.add(GlobalSetting(key=item.key, value=item.value))
                
    db.commit()
    return {"message": "Settings updated"}
