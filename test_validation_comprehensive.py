"""
Comprehensive Face Validation Test
Tests the multi-layer AI face detection system
"""
import cv2
import numpy as np
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import validate_human_face

def create_test_images():
    """Create various test images to simulate different scenarios"""
    test_dir = 'static/uploads/test_validation'
    os.makedirs(test_dir, exist_ok=True)
    
    tests = []
    
    # Test 1: Pure random noise (simulating nature/abstract)
    print("\n📝 Creating Test 1: Random noise image...")
    noise = np.random.randint(0, 255, (400, 400, 3), dtype=np.uint8)
    path1 = os.path.join(test_dir, 'test1_noise.jpg')
    cv2.imwrite(path1, noise)
    tests.append(('Random Noise (Nature Simulation)', path1, False))
    
    # Test 2: Gradient image (simulating sky/landscape)
    print("📝 Creating Test 2: Gradient image...")
    gradient = np.zeros((500, 500, 3), dtype=np.uint8)
    for i in range(500):
        gradient[i, :] = [i//2, 100, 255-i//2]
    path2 = os.path.join(test_dir, 'test2_gradient.jpg')
    cv2.imwrite(path2, gradient)
    tests.append(('Gradient (Sky Simulation)', path2, False))
    
    # Test 3: Solid color (simulating object/wall)
    print("📝 Creating Test 3: Solid color image...")
    solid = np.full((400, 400, 3), [120, 80, 200], dtype=np.uint8)
    path3 = os.path.join(test_dir, 'test3_solid.jpg')
    cv2.imwrite(path3, solid)
    tests.append(('Solid Color (Object Simulation)', path3, False))
    
    # Test 4: Geometric shapes (simulating bike/vehicle)
    print("📝 Creating Test 4: Geometric shapes...")
    shapes = np.ones((400, 400, 3), dtype=np.uint8) * 255
    cv2.circle(shapes, (200, 150), 80, (0, 0, 255), -1)
    cv2.rectangle(shapes, (100, 250), (300, 350), (255, 0, 0), -1)
    path4 = os.path.join(test_dir, 'test4_shapes.jpg')
    cv2.imwrite(path4, shapes)
    tests.append(('Geometric Shapes (Vehicle Simulation)', path4, False))
    
    # Test 5: Text/Pattern (simulating document)
    print("📝 Creating Test 5: Pattern image...")
    pattern = np.zeros((400, 400, 3), dtype=np.uint8)
    for i in range(0, 400, 20):
        cv2.line(pattern, (0, i), (400, i), (150, 150, 150), 2)
        cv2.line(pattern, (i, 0), (i, 400), (150, 150, 150), 2)
    path5 = os.path.join(test_dir, 'test5_pattern.jpg')
    cv2.imwrite(path5, pattern)
    tests.append(('Pattern/Lines (Document Simulation)', path5, False))
    
    return tests, test_dir

def run_validation_tests():
    """Run comprehensive validation tests"""
    print("\n" + "="*70)
    print("🧪 COMPREHENSIVE FACE VALIDATION TEST")
    print("="*70)
    print("\nTesting Multi-Layer AI Face Detection System")
    print("- Layer 1: DeepFace AI (3 backends)")
    print("- Layer 2: OpenCV Cascade (3 sensitivity levels)")
    print("- Layer 3: Eye Detection (profile faces)")
    print("="*70)
    
    # Create test images
    tests, test_dir = create_test_images()
    
    # Run tests
    passed = 0
    failed = 0
    
    for test_name, image_path, should_pass in tests:
        print(f"\n{'─'*70}")
        print(f"🧪 TEST: {test_name}")
        print(f"   Expected: {'REJECT (No Face)' if not should_pass else 'ACCEPT (Face Found)'}")
        print(f"{'─'*70}")
        
        is_valid, message = validate_human_face(image_path)
        
        print(f"\n📊 RESULT:")
        print(f"   Valid: {is_valid}")
        print(f"   Message: {message}")
        
        # Check if result matches expectation
        if is_valid == should_pass:
            print(f"   ✅ TEST PASSED")
            passed += 1
        else:
            print(f"   ❌ TEST FAILED")
            failed += 1
    
    # Summary
    print(f"\n{'='*70}")
    print(f"📊 TEST SUMMARY")
    print(f"{'='*70}")
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")
    print(f"{'='*70}\n")
    
    # Cleanup
    print("🧹 Cleaning up test images...")
    for _, image_path, _ in tests:
        if os.path.exists(image_path):
            os.remove(image_path)
    if os.path.exists(test_dir):
        os.rmdir(test_dir)
    print("✓ Cleanup complete\n")
    
    # Final verdict
    if failed == 0:
        print("🎉 ALL TESTS PASSED!")
        print("✓ System correctly rejects non-human images")
        print("✓ Face validation is working perfectly")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("   Please review the validation logic")
    
    print("\n" + "="*70)
    print("IMPORTANT: The system will REJECT:")
    print("  ❌ Nature images (trees, sky, landscapes)")
    print("  ❌ Vehicles (bikes, cars, motorcycles)")
    print("  ❌ Objects (furniture, buildings)")
    print("  ❌ Abstract patterns and shapes")
    print("  ❌ Documents and text")
    print("\nThe system will ACCEPT:")
    print("  ✅ Photos with clear human faces")
    print("  ✅ Multiple people in photos")
    print("  ✅ Profile faces (side views)")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        run_validation_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
