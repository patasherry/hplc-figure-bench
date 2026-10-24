import os
import json
import numpy as np
from PIL import Image

def generate_synthetic_gel(output_dir):
    """
    Generates a synthetic gel image with lanes of Gaussian bands of known relative amounts.
    Saves it as PNG, JPEG (quality 95), 8-bit TIFF, and 16-bit TIFF.
    """
    np.random.seed(42)
    os.makedirs(output_dir, exist_ok=True)

    # Image dimensions
    width, height = 400, 300

    # Create a blank 16-bit image (background = 1000)
    # We use a 16-bit array to be able to save it as 16-bit TIFF directly
    # Need uint32 for PIL I mode, or use specific saving for 16-bit TIFF
    img_array = np.full((height, width), 60000, dtype=np.uint16)

    # Define bands: (y_center, amplitude)
    # Background is 60000, max darkness is 0.
    bands = [
        (50, 10000),   # Band 1
        (120, 20000),  # Band 2 (2x band 1)
        (200, 40000),  # Band 3 (4x band 1)
        (260, 5000),   # Band 4 (0.5x band 1)
    ]

    # Band shape parameters
    sigma_y = 5.0
    sigma_x = 40.0
    x_center = 200

    y, x = np.ogrid[0:height, 0:width]

    for y_c, amp in bands:
        g = np.exp(-((x - x_center)**2 / (2 * sigma_x**2) + (y - y_c)**2 / (2 * sigma_y**2)))
        img_array = img_array - (amp * g).astype(np.uint16)

    img_array = np.clip(img_array, 0, 65535)

    # Save 16-bit TIFF using PIL
    img_16bit = Image.fromarray(img_array.astype(np.int32), mode='I')
    # Save as 16-bit using TIFF format, which PIL supports for 'I;16' if we convert properly,
    # but 'I' mode saves as 32-bit.
    # We can write the raw bytes to a 16-bit grayscale TIFF, or use tifffile.
    import tifffile
    tifffile.imwrite(os.path.join(output_dir, 'gel_16bit.tiff'), img_array)

    # Convert to 8-bit for PNG, JPEG, and 8-bit TIFF
    img_array_8bit = (img_array / 256).astype(np.uint8)
    img_8bit = Image.fromarray(img_array_8bit, mode='L')

    img_8bit.save(os.path.join(output_dir, 'gel_8bit.png'))
    img_8bit.save(os.path.join(output_dir, 'gel_8bit.jpg'), quality=95)
    img_8bit.save(os.path.join(output_dir, 'gel_8bit.tiff'))

    # Calculate expected relative percentages
    total_amp = sum(amp for _, amp in bands)
    expected_percentages = [(amp / total_amp) * 100 for _, amp in bands]

    # Save expected values to a JSON file
    expected_data = {
        "bands": [
            {"y": y_c, "amp": amp, "percentage": pct}
            for (y_c, amp), pct in zip(bands, expected_percentages)
        ]
    }
    with open(os.path.join(output_dir, 'expected.json'), 'w') as f:
        json.dump(expected_data, f, indent=2)

if __name__ == '__main__':
    generate_synthetic_gel('tests/data/gels/formats')
