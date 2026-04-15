"""
Face matching using DeepFace with FaceNet512 - Better discrimination
This replaces the overfitted custom CNN with a proven pretrained model
"""

import os
import sys
import numpy as np
import json
from datetime import datetime

# Add project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✓ DeepFace module loaded")
except ImportError as e:
    print("⚠️  DeepFace not installed. Run: pip install deepface tensorflow")
    print(f"   Error: {e}")
    DEEPFACE_AVAILABLE = False
except Exception as e:
    print(f"⚠️  DeepFace import warning: {e}")
    DEEPFACE_AVAILABLE = False


def extract_embedding_deepface(image_path, model_name='Facenet512'):
    """
    Extract face embedding using DeepFace with FaceNet512
    
    Args:
        image_path: Path to image file
        model_name: 'Facenet512', 'ArcFace', 'VGG-Face', 'Facenet'
    
    Returns:
        numpy array: 512-D embedding (normalized)
    """
    try:
        # Verify file exists
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            return None
        
        # Extract embedding with better error handling
        embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            enforce_detection=True,
            detector_backend='opencv',  # Faster than mtcnn
            align=True
        )
        
        if not embedding_objs:
            return None
        
        # Get first face embedding
        embedding = np.array(embedding_objs[0]["embedding"])
        
        # Normalize to unit length
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
        
    except Exception as e:
        print(f"Error extracting embedding: {e}")
        return None


def match_face_deepface(query_image_path, embeddings_file='embeddings_deepface.json', 
                       threshold=0.60, model_name='Facenet512'):
    """
    Match face using DeepFace embeddings
    
    Args:
        query_image_path: Path to query image
        embeddings_file: Path to embeddings JSON
        threshold: Similarity threshold (0.60 = 60%)
        model_name: DeepFace model to use
    
    Returns:
        dict: Match results
    """
    
    if not DEEPFACE_AVAILABLE:
        return None
    
    # Load embeddings database
    if not os.path.exists(embeddings_file):
        print(f"❌ Embeddings file not found: {embeddings_file}")
        return None
    
    with open(embeddings_file, 'r') as f:
        db = json.load(f)
    
    print(f"\n{'='*60}")
    print("DEEPFACE FACE MATCHING")
    print(f"{'='*60}")
    print(f"Query: {query_image_path}")
    print(f"Model: {model_name}")
    print(f"Threshold: {threshold:.2f}")
    print(f"Database: {len(db['embeddings'])} embeddings from {db['num_persons']} persons")
    print(f"{'='*60}\n")
    
    # Extract query embedding
    print("Extracting query embedding...")
    query_embedding = extract_embedding_deepface(query_image_path, model_name)
    
    if query_embedding is None:
        print("❌ Failed to extract query embedding")
        return None
    
    query_norm = np.linalg.norm(query_embedding)
    print(f"✅ Query embedding extracted (norm: {query_norm:.6f})")
    
    # Load database embeddings
    db_embeddings = np.array(db['embeddings'])
    db_labels = db['labels']
    
    # Normalize both query and database embeddings for true cosine similarity
    query_embedding_normalized = query_embedding / (query_norm + 1e-10)
    db_norms = np.linalg.norm(db_embeddings, axis=1, keepdims=True)
    db_embeddings_normalized = db_embeddings / (db_norms + 1e-10)
    
    # Calculate cosine similarities (now properly bounded between -1 and 1)
    similarities = np.dot(db_embeddings_normalized, query_embedding_normalized)
    
    # Sort by similarity
    sorted_indices = np.argsort(similarities)[::-1]
    
    # Get top matches
    top_matches = []
    for idx in sorted_indices[:10]:
        name = db_labels[idx]
        similarity = float(similarities[idx])
        top_matches.append((name, similarity))
    
    print(f"\n📊 Top 10 Matches:")
    for i, (name, sim) in enumerate(top_matches, 1):
        print(f"   {i}. {name}: {sim:.4f} ({sim*100:.1f}%)")
    
    # Find best match
    best_idx = sorted_indices[0]
    best_name = db_labels[best_idx]
    best_similarity = float(similarities[best_idx])
    
    print(f"\n{'='*60}")
    
    if best_similarity >= threshold:
        print(f"✅ MATCH FOUND: {best_name}")
        print(f"   Confidence: {best_similarity*100:.1f}%")
        print(f"   Similarity: {best_similarity:.4f}")
        print(f"{'='*60}\n")
        
        return {
            'match_found': True,
            'person_name': best_name,
            'confidence': best_similarity * 100,
            'similarity': best_similarity,
            'all_matches': top_matches,
            'data_source': db.get('source', 'unknown')
        }
    else:
        print(f"❌ NO MATCH (best: {best_name} at {best_similarity*100:.1f}%)")
        print(f"{'='*60}\n")
        
        return {
            'match_found': False,
            'best_name': best_name,
            'best_similarity': best_similarity,
            'all_matches': top_matches,
            'data_source': db.get('source', 'unknown')
        }


if __name__ == '__main__':
    # Test
    test_image = 'static/uploads/missing/20251130_194835_rucha.jpg'
    
    if os.path.exists(test_image):
        result = match_face_deepface(test_image)
        print("\nTest Result:", result)
    else:
        print(f"Test image not found: {test_image}")
