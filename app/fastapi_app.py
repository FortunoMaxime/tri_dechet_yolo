from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import cv2
import numpy as np
import uvicorn
from ultralytics import YOLO
import base64
import io
from PIL import Image
import json
from typing import List, Dict, Any, Optional
import asyncio
import threading
from pathlib import Path
import settings
import helper

# Configuration FastAPI
app = FastAPI(
    title="Waste Classification Mobile API",
    description="API mobile pour la classification des déchets avec YOLOv8",
    version="2.0.0"
)

# Middleware CORS pour React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# État global pour le streaming
camera_active = False
current_frame = None
camera_lock = threading.Lock()

# Charger le modèle
try:
    model = helper.load_model('weights/yoloooo.pt')
    print("✅ Modèle YOLO chargé avec succès")
except Exception as e:
    print(f"❌ Erreur chargement modèle: {e}")
    model = None

# Modèles Pydantic pour la validation
from pydantic import BaseModel

class DetectionRequest(BaseModel):
    confidence: float = 0.5
    image: Optional[str] = None

class DetectionResponse(BaseModel):
    success: bool
    detections: List[Dict[str, Any]]
    count: int
    image_with_boxes: Optional[str] = None
    message: str = ""

class WebcamStatus(BaseModel):
    active: bool
    message: str

# Routes de l'API
@app.get("/")
async def root():
    return {
        "message": "Waste Classification Mobile API",
        "endpoints": {
            "health": "/api/health",
            "detect_image": "/api/detect/image",
            "detect_upload": "/api/detect/upload", 
            "webcam_start": "/api/webcam/start",
            "webcam_stop": "/api/webcam/stop",
            "webcam_stream": "/api/webcam/stream",
            "model_info": "/api/model/info"
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "camera_active": camera_active
    }

@app.get("/api/model/info")
async def model_info():
    """Informations sur le modèle chargé"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_name": "YOLOv8 Waste Classification",
        "classes": model.names if hasattr(model, 'names') else {},
        "input_size": getattr(model, 'imgsz', 640)
    }

@app.post("/api/detect/image", response_model=DetectionResponse)
async def detect_image(request: DetectionRequest):
    """Détection sur image base64"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if not request.image:
            raise HTTPException(status_code=400, detail="No image provided")
        
        # Décoder l'image base64
        image_data = request.image
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        img_np = np.array(image)
        
        return await process_detection(img_np, request.confidence)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect/upload", response_model=DetectionResponse)
async def detect_upload(
    file: UploadFile = File(...),
    confidence: float = 0.5
):
    """Détection sur fichier uploadé"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Lire et convertir l'image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        img_np = np.array(image)
        
        return await process_detection(img_np, confidence)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_detection(img_np: np.ndarray, confidence: float) -> DetectionResponse:
    """Traite la détection et retourne les résultats"""
    try:
        # Conversion BGR pour OpenCV
        if len(img_np.shape) == 3 and img_np.shape[2] == 3:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        
        # Prédiction YOLO
        results = model.predict(img_np, conf=confidence)
        
        detections = []
        result_image = img_np.copy()
        
        for r in results:
            boxes = r.boxes
            if boxes is not None:
                # Dessiner les boîtes sur l'image
                result_image = r.plot()
                
                for box in boxes:
                    detection = {
                        'class': model.names[int(box.cls)],
                        'class_id': int(box.cls),
                        'confidence': float(box.conf),
                        'bbox': box.xywhn[0].tolist() if box.xywhn.numel() > 0 else [],
                        'bbox_pixels': box.xyxy[0].tolist() if box.xyxy.numel() > 0 else []
                    }
                    detections.append(detection)
        
        # Convertir l'image résultat en base64
        _, buffer = cv2.imencode('.jpg', result_image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return DetectionResponse(
            success=True,
            detections=detections,
            count=len(detections),
            image_with_boxes=image_base64,
            message=f"{len(detections)} objets détectés" if detections else "Aucun objet détecté"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement: {str(e)}")

# Fonctions pour le streaming webcam
def webcam_stream_task(confidence: float):
    """Thread pour capturer le flux webcam"""
    global camera_active, current_frame
    
    try:
        cap = cv2.VideoCapture(settings.WEBCAM_PATH)
        
        while camera_active:
            ret, frame = cap.read()
            if ret:
                # Redimensionner pour performance mobile
                frame = cv2.resize(frame, (640, 480))
                
                # Détection en temps réel
                results = model.predict(frame, conf=confidence)
                
                # Dessiner les résultats
                for r in results:
                    frame = r.plot()
                
                with camera_lock:
                    current_frame = frame
            else:
                break
            
            # Limiter à ~10 FPS
            cv2.waitKey(100)
        
        cap.release()
        print("📹 Stream webcam arrêté")
        
    except Exception as e:
        print(f"❌ Erreur webcam: {e}")
        camera_active = False

@app.post("/api/webcam/start")
async def webcam_start(confidence: float = 0.5):
    """Démarrer le streaming webcam"""
    global camera_active
    
    if camera_active:
        return {"status": "already_active", "message": "Webcam déjà active"}
    
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    camera_active = True
    # Démarrer le thread webcam
    thread = threading.Thread(target=webcam_stream_task, args=(confidence,))
    thread.daemon = True
    thread.start()
    
    return {
        "status": "started", 
        "message": "Webcam démarrée",
        "confidence": confidence
    }

@app.post("/api/webcam/stop")
async def webcam_stop():
    """Arrêter le streaming webcam"""
    global camera_active
    camera_active = False
    
    return {
        "status": "stopped",
        "message": "Webcam arrêtée"
    }

@app.get("/api/webcam/status")
async def webcam_status():
    """Statut du streaming webcam"""
    return WebcamStatus(
        active=camera_active,
        message="Webcam active" if camera_active else "Webcam inactive"
    )

@app.get("/api/webcam/stream")
async def webcam_stream():
    """Streaming MJPEG pour la webcam"""
    async def generate_frames():
        while camera_active:
            with camera_lock:
                if current_frame is not None:
                    # Encoder en JPEG
                    _, buffer = cv2.imencode('.jpg', current_frame)
                    frame_data = buffer.tobytes()
                    
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
            
            await asyncio.sleep(0.1)  # ~10 FPS
    
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/webcam/frame")
async def webcam_frame():
    """Récupérer une frame unique de la webcam"""
    if not camera_active:
        raise HTTPException(status_code=400, detail="Webcam not active")
    
    with camera_lock:
        if current_frame is None:
            raise HTTPException(status_code=404, detail="No frame available")
        
        _, buffer = cv2.imencode('.jpg', current_frame)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "success": True,
            "image": image_base64,
            "timestamp": asyncio.get_event_loop().time()
        }

# Routes pour les vidéos stockées
@app.get("/api/videos/list")
async def list_videos():
    """Liste des vidéos disponibles"""
    videos = []
    for name, path in settings.VIDEOS_DICT.items():
        if Path(path).exists():
            videos.append({
                "name": name,
                "path": str(path),
                "display_name": name.replace('_', ' ').title()
            })
    
    return {"videos": videos}

@app.post("/api/videos/detect/{video_name}")
async def detect_video(video_name: str, confidence: float = 0.5):
    """Détection sur une vidéo stockée"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if video_name not in settings.VIDEOS_DICT:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = settings.VIDEOS_DICT[video_name]
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Cannot open video")
        
        # Traiter la première frame pour démonstration
        success, frame = cap.read()
        if success:
            response = await process_detection(frame, confidence)
            cap.release()
            return response
        else:
            cap.release()
            raise HTTPException(status_code=400, detail="Cannot read video frame")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gestion des erreurs globales
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "fastapi_app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )