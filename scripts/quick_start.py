"""
Quick Start Script for Custom CNN Face Recognition Model

This script provides an easy way to:
1. Check system requirements
2. Prepare dataset
3. Train model
4. Evaluate performance
5. Test inference

Usage:
    python quick_start.py --help
"""

import os
import sys
import argparse
import json
from pathlib import Path
import time

# Check if required packages are available
def check_dependencies():
    """Check if all required packages are installed"""
    print("\n" + "="*70)
    print("Checking Dependencies")
    print("="*70 + "\n")
    
    required = {
        'tensorflow': '2.13.0',
        'numpy': '1.24.0',
        'opencv-python': '4.7.0',
        'sklearn': '1.3.0',
        'matplotlib': '3.7.0',
        'tqdm': '4.66.0'
    }
    
    missing = []
    installed = []
    
    for package, min_version in required.items():
        try:
            if package == 'opencv-python':
                import cv2
                installed.append(f"✓ {package}: {cv2.__version__}")
            elif package == 'sklearn':
                import sklearn
                installed.append(f"✓ scikit-learn: {sklearn.__version__}")
            else:
                module = __import__(package)
                version = getattr(module, '__version__', 'unknown')
                installed.append(f"✓ {package}: {version}")
        except ImportError:
            missing.append(f"✗ {package} (>= {min_version})")
    
    for pkg in installed:
        print(pkg)
    
    if missing:
        print("\n⚠ Missing packages:")
        for pkg in missing:
            print(f"  {pkg}")
        print("\nInstall with:")
        print("  pip install -r requirements_custom.txt")
        return False
    
    print("\n✓ All dependencies satisfied!")
    return True


def check_dataset(dataset_dir):
    """Check if dataset is properly formatted"""
    print("\n" + "="*70)
    print("Checking Dataset")
    print("="*70 + "\n")
    
    if not os.path.exists(dataset_dir):
        print(f"✗ Dataset directory not found: {dataset_dir}")
        print("\nExpected structure:")
        print("  dataset_train/")
        print("    person1/")
        print("      image1.jpg")
        print("      image2.jpg")
        print("    person2/")
        print("      image1.jpg")
        return False
    
    persons = [d for d in os.listdir(dataset_dir) 
               if os.path.isdir(os.path.join(dataset_dir, d))]
    
    if not persons:
        print(f"✗ No person directories found in {dataset_dir}")
        return False
    
    total_images = 0
    valid_persons = 0
    
    for person in persons:
        person_dir = os.path.join(dataset_dir, person)
        images = [f for f in os.listdir(person_dir) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if len(images) >= 2:  # Need at least 2 images per person
            valid_persons += 1
            total_images += len(images)
    
    print(f"✓ Dataset found: {dataset_dir}")
    print(f"✓ Total persons: {len(persons)}")
    print(f"✓ Valid persons (>=2 images): {valid_persons}")
    print(f"✓ Total images: {total_images}")
    
    if valid_persons < 2:
        print("\n⚠ Warning: Need at least 2 persons with 2+ images each")
        return False
    
    return True


def train_model(args):
    """Train the custom CNN model"""
    print("\n" + "="*70)
    print("Training Custom CNN Model")
    print("="*70 + "\n")
    
    from train_custom_model import train_classification_model, train_triplet_model
    
    if args.loss == 'triplet':
        model, history, model_path = train_triplet_model(
            dataset_dir=args.dataset,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr
        )
    else:
        model, history, model_path = train_classification_model(
            dataset_dir=args.dataset,
            model_type=args.model_type,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr
        )
    
    print(f"\n✓ Training completed!")
    print(f"✓ Model saved to: {model_path}")
    
    return model_path


def evaluate_model(model_path, test_dir):
    """Evaluate trained model"""
    print("\n" + "="*70)
    print("Evaluating Model")
    print("="*70 + "\n")
    
    from evaluate_model import ModelEvaluator
    from tensorflow import keras
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    
    # Load model
    print(f"Loading model: {model_path}")
    model = keras.models.load_model(model_path, compile=False)
    
    # Create test data generator
    test_datagen = ImageDataGenerator(rescale=1./255)
    test_data = test_datagen.flow_from_directory(
        test_dir,
        target_size=(160, 160),
        batch_size=32,
        class_mode='categorical',
        shuffle=False
    )
    
    # Evaluate
    evaluator = ModelEvaluator(model, 'CustomCNN', output_dir='evaluation_results')
    
    # Classification metrics
    class_results = evaluator.evaluate_classification(test_data)
    
    # Speed benchmark
    speed_results = evaluator.benchmark_speed()
    
    # Visualize embeddings
    evaluator.visualize_embeddings(test_data, max_samples=500)
    
    # Save results
    evaluator.save_results()
    
    print("\n✓ Evaluation completed!")
    print(f"✓ Results saved to: evaluation_results/")


def build_database(model_path, dataset_dir, output_file):
    """Build embeddings database"""
    print("\n" + "="*70)
    print("Building Embeddings Database")
    print("="*70 + "\n")
    
    from face_matcher_custom import build_embeddings
    
    build_embeddings(
        dataset_dir=dataset_dir,
        embeddings_file=output_file,
        backend='custom',
        model_path=model_path,
        detector='mtcnn'
    )
    
    print(f"\n✓ Database built!")
    print(f"✓ Saved to: {output_file}")


def test_inference(model_path, embeddings_file, test_image):
    """Test inference on a single image"""
    print("\n" + "="*70)
    print("Testing Inference")
    print("="*70 + "\n")
    
    from face_matcher_custom import match_image
    
    print(f"Query image: {test_image}")
    print("Searching for matches...\n")
    
    start_time = time.time()
    
    matches = match_image(
        image_path=test_image,
        embeddings_file=embeddings_file,
        backend='custom',
        model_path=model_path,
        detector='mtcnn',
        top_k=5,
        threshold=0.4
    )
    
    end_time = time.time()
    
    if matches:
        print(f"Found {len(matches)} matches:\n")
        for i, match in enumerate(matches, 1):
            print(f"{i}. {match['label']}")
            print(f"   Confidence: {match['score']:.2%}")
            print(f"   Image: {match['best_image']}\n")
    else:
        print("No matches found above threshold")
    
    print(f"Inference time: {(end_time - start_time)*1000:.2f}ms")


def main():
    parser = argparse.ArgumentParser(
        description='Quick Start for Custom CNN Face Recognition',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline (check, train, evaluate)
  python quick_start.py --mode full --dataset dataset_train --test-dataset dataset_test
  
  # Just train
  python quick_start.py --mode train --dataset dataset_train --epochs 50
  
  # Just evaluate existing model
  python quick_start.py --mode evaluate --model models/best_model.h5 --test-dataset dataset_test
  
  # Build database
  python quick_start.py --mode database --model models/best_model.h5 --dataset dataset_train
  
  # Test single image
  python quick_start.py --mode test --model models/best_model.h5 --test-image face.jpg
        """
    )
    
    parser.add_argument('--mode', required=True,
                       choices=['check', 'train', 'evaluate', 'database', 'test', 'full'],
                       help='Operation mode')
    
    parser.add_argument('--dataset', default='dataset_train',
                       help='Training dataset directory')
    
    parser.add_argument('--test-dataset', default='dataset_test',
                       help='Test dataset directory')
    
    parser.add_argument('--model', help='Path to trained model')
    
    parser.add_argument('--model-type', default='custom',
                       choices=['custom', 'enhanced'],
                       help='Model architecture')
    
    parser.add_argument('--loss', default='arcface',
                       choices=['arcface', 'triplet', 'crossentropy'],
                       help='Loss function')
    
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Batch size')
    
    parser.add_argument('--lr', type=float, default=0.001,
                       help='Learning rate')
    
    parser.add_argument('--embeddings', default='embeddings_custom.json',
                       help='Embeddings database file')
    
    parser.add_argument('--test-image', help='Test image for inference')
    
    args = parser.parse_args()
    
    # Create necessary directories
    os.makedirs('models', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    os.makedirs('evaluation_results', exist_ok=True)
    
    # Mode: Check
    if args.mode in ['check', 'full']:
        if not check_dependencies():
            print("\n⚠ Please install missing dependencies first")
            return
        
        if not check_dataset(args.dataset):
            print("\n⚠ Please fix dataset issues first")
            return
        
        print("\n✓ All checks passed!")
    
    # Mode: Train
    if args.mode in ['train', 'full']:
        model_path = train_model(args)
        args.model = model_path
    
    # Mode: Evaluate
    if args.mode in ['evaluate', 'full']:
        if not args.model:
            print("✗ Error: --model required for evaluation")
            return
        
        if not os.path.exists(args.test_dataset):
            print(f"✗ Error: Test dataset not found: {args.test_dataset}")
            return
        
        evaluate_model(args.model, args.test_dataset)
    
    # Mode: Database
    if args.mode in ['database', 'full']:
        if not args.model:
            print("✗ Error: --model required for building database")
            return
        
        build_database(args.model, args.dataset, args.embeddings)
    
    # Mode: Test
    if args.mode == 'test':
        if not args.model:
            print("✗ Error: --model required for testing")
            return
        
        if not args.test_image:
            print("✗ Error: --test-image required for testing")
            return
        
        if not os.path.exists(args.embeddings):
            print(f"✗ Error: Embeddings file not found: {args.embeddings}")
            print("Run with --mode database first")
            return
        
        test_inference(args.model, args.embeddings, args.test_image)
    
    print("\n" + "="*70)
    print("✓ All operations completed successfully!")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
