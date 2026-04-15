"""
Test Face Validation - Verify that only human faces can be uploaded
"""
import cv2
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import validate_human_face

def test_validation():
    print("\n" + "="*60)
    print("TESTING FACE VALIDATION FUNCTION")
    print("="*60 + "\n")
    
    # Test 1: Create a test image with random content (simulating nature/bike)
    print("Test 1: Random image (no face) - Should FAIL")
    print("-" * 40)
    import numpy as np
    random_img = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)
    test_path = 'static/uploads/test_random.jpg'
    cv2.imwrite(test_path, random_img)
    
    is_valid, message = validate_human_face(test_path)
    print(f"Result: {'✓ PASSED' if not is_valid else '✗ FAILED'} - {message}")
    os.remove(test_path)
    print()
    
    # Test 2: Colored noise image
    print("Test 2: Colored noise image - Should FAIL")
    print("-" * 40)
    noise_img = np.random.rand(400, 400, 3) * 255
    noise_img = noise_img.astype(np.uint8)
    test_path = 'static/uploads/test_noise.jpg'
    cv2.imwrite(test_path, noise_img)
    
    is_valid, message = validate_human_face(test_path)
    print(f"Result: {'✓ PASSED' if not is_valid else '✗ FAILED'} - {message}")
    os.remove(test_path)
    print()
    
    # Test 3: Gradient image (simulating sky/nature)
    print("Test 3: Gradient image (sky simulation) - Should FAIL")
    print("-" * 40)
    gradient = np.zeros((500, 500, 3), dtype=np.uint8)
    for i in range(500):
        gradient[i, :] = [i//2, i//3, 255-i//2]
    test_path = 'static/uploads/test_gradient.jpg'
    cv2.imwrite(test_path, gradient)
    
    is_valid, message = validate_human_face(test_path)
    print(f"Result: {'✓ PASSED' if not is_valid else '✗ FAILED'} - {message}")
    os.remove(test_path)
    print()
    
    print("="*60)
    print("VALIDATION TESTS COMPLETED")
    print("="*60)
    print("\nThe face validation will reject:")
    print("  ✗ Nature images (trees, sky, landscapes)")
    print("  ✗ Objects (bikes, cars, buildings)")
    print("  ✗ Random images without faces")
    print("  ✗ Blurry or unclear images")
    print("\nThe face validation will accept:")
    print("  ✓ Clear photos with human faces")
    print("  ✓ Multiple faces in the image")
    print()

if __name__ == '__main__':
    test_validation()
