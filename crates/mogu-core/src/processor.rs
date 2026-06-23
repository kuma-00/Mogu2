use image::DynamicImage;
use ndarray::Array4;

pub struct ImageProcessor {
    width: u32,
    height: u32,
    mean: [f32; 3],
    std: [f32; 3],
}

impl ImageProcessor {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            mean: [0.0, 0.0, 0.0],
            std: [1.0, 1.0, 1.0],
        }
    }

    pub fn with_imagenet_normalization(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            mean: [0.485, 0.456, 0.406],
            std: [0.229, 0.224, 0.225],
        }
    }

    pub fn preprocess(&self, img: &DynamicImage) -> Array4<f32> {
        // resize_to_fill preserves aspect ratio by cropping extra parts instead of distorting
        let resized = img.resize_to_fill(self.width, self.height, image::imageops::FilterType::Triangle);
        let rgb = resized.to_rgb8();
        
        let raw = rgb.into_raw();
        let hwc = ndarray::Array3::from_shape_vec((self.height as usize, self.width as usize, 3), raw)
            .expect("Failed to create array from image data");
        
        let mean = ndarray::arr1(&self.mean).insert_axis(ndarray::Axis(1)).insert_axis(ndarray::Axis(2));
        let std = ndarray::arr1(&self.std).insert_axis(ndarray::Axis(1)).insert_axis(ndarray::Axis(2));
        
        let chw = hwc.permuted_axes([2, 0, 1]).mapv(|x| x as f32 / 255.0);
        let normalized = (&chw - &mean) / &std;

        normalized
            .as_standard_layout()
            .to_owned()
            .insert_axis(ndarray::Axis(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::RgbImage;

    #[test]
    fn test_image_processor() {
        let img = DynamicImage::ImageRgb8(RgbImage::new(100, 200));
        let processor = ImageProcessor::with_imagenet_normalization(224, 224);
        let preprocessed = processor.preprocess(&img);
        assert_eq!(preprocessed.shape(), &[1, 3, 224, 224]);
    }
}

