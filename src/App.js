import jsPDF from "jspdf";
import { useCallback, useState } from "react";
import { FileUploader } from "react-drag-drop-files";
import "./App.css";

// Allowed file types for Drag and Drop zone
const fileTypes = ["JPG", "JPEG", "PNG"];

// New class with additional fields for Image
class CustomImage extends Image {
  constructor(mimeType) {
    // constructor(public mimeType: string) {
    super();
    this.mimeType = mimeType;
  }

  // `imageType` is a required input for generating a PDF for an image.
  get imageType() {
    return this.mimeType.split("/")[1];
  }
}

// Each image is loaded and an object URL is created.
const fileToImageURL = (file) => {
  return new Promise((resolve, reject) => {
    const image = new CustomImage(file.type);

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new Error("Failed to convert File to Image"));
    };

    image.src = URL.createObjectURL(file);
  });
};

// The dimensions are in millimeters.
const A4_PAPER_DIMENSIONS = {
  width: 210,
  height: 297,
};

const A4_PAPER_RATIO = A4_PAPER_DIMENSIONS.width / A4_PAPER_DIMENSIONS.height;

// Calculates the best possible position of an image on the A4 paper format,
// so that the maximal area of A4 is used and the image ratio is preserved.
const imageDimensionsOnA4 = (dimensions) => {
  const isLandscapeImage = dimensions.width >= dimensions.height;

  // If the image is in landscape, the full width of A4 is used.
  if (isLandscapeImage) {
    return {
      width: A4_PAPER_DIMENSIONS.width,
      height:
        A4_PAPER_DIMENSIONS.width / (dimensions.width / dimensions.height),
    };
  }

  // If the image is in portrait and the full height of A4 would skew
  // the image ratio, we scale the image dimensions.
  const imageRatio = dimensions.width / dimensions.height;
  if (imageRatio > A4_PAPER_RATIO) {
    const imageScaleFactor =
      (A4_PAPER_RATIO * dimensions.height) / dimensions.width;

    const scaledImageHeight = A4_PAPER_DIMENSIONS.height * imageScaleFactor;

    return {
      height: scaledImageHeight,
      width: scaledImageHeight * imageRatio,
    };
  }

  // The full height of A4 can be used without skewing the image ratio.
  return {
    width: A4_PAPER_DIMENSIONS.height / (dimensions.height / dimensions.width),
    height: A4_PAPER_DIMENSIONS.height,
  };
};

// Creates a PDF document containing all the uploaded images.
const generatePdfFromImages = (images) => {
  // Default export is A4 paper, portrait, using millimeters for units.
  const doc = new jsPDF();

  // We let the images add all pages,
  // therefore the first default page can be removed.
  doc.deletePage(1);

  images.forEach((image) => {
    const imageDimensions = imageDimensionsOnA4({
      width: image.width,
      height: image.height,
    });

    doc.addPage();
    doc.addImage(
      image.src,
      image.imageType,
      // Images are vertically and horizontally centered on the page.
      (A4_PAPER_DIMENSIONS.width - imageDimensions.width) / 2,
      (A4_PAPER_DIMENSIONS.height - imageDimensions.height) / 2,
      imageDimensions.width,
      imageDimensions.height
    );
  });

  // Creates a PDF and opens it in a new browser tab.
  const pdfURL = doc.output("bloburl");
  window.open(pdfURL, "_blank");
};

function App() {
  // State for uploaded images
  const [uploadedImages, setUploadedImages] = useState([]);

  // State for force reload flag
  // TODO: fork & rewrite <FileUploader /> to avoid this crutch
  const [flag, setFlag] = useState(false);

  const handleImageUpload = useCallback(
    (fileList) => {
      // we convert fileList to Array for easier manipulation.
      const fileArray = fileList ? Array.from(fileList) : [];

      // Uploaded images are read and the app state is updated.
      const fileToImagePromises = fileArray.map(fileToImageURL);
      Promise.all(fileToImagePromises).then(setUploadedImages);
    },
    [setUploadedImages]
  );

  const cleanUpUploadedImages = useCallback(() => {
    setUploadedImages([]);
    uploadedImages.forEach((image) => {
      // The URL.revokeObjectURL() releases an existing object URL
      // which was previously created by URL.createObjectURL().
      // It lets the browser know not to keep the reference to the file any longer.
      URL.revokeObjectURL(image.src);
    });
  }, [setUploadedImages, uploadedImages]);

  const handleGeneratePdfFromImages = useCallback(() => {
    generatePdfFromImages(uploadedImages);
    cleanUpUploadedImages();
  }, [uploadedImages, cleanUpUploadedImages]);

  return (
    <>
      <h1>Convert images to PDFs</h1>
      {/* Drag and Drop zone*/}
      <FileUploader
        // to rerender on uploadedImages change
        key={flag}
        // ^this should be refactored
        handleChange={handleImageUpload}
        name="file"
        types={fileTypes}
        hoverTitle="Drop here!"
        maxSize={2}
        multiple
      />
      {/* Overview of uploaded images */}
      <h2>Overview of uploaded images</h2>
      {uploadedImages.length > 0 ? (
        <>
          <div className="images-container">
            {uploadedImages.map((image) => (
              <img
                key={image.src}
                src={image.src}
                className="uploaded-image"
                alt={"Error loading preview"}
              />
            ))}
          </div>
          {/* Buttons for resetting images and generating a PDF */}
          <div className="buttons-container">
            {/* Resets uploaded images */}
            {uploadedImages.length !== 0 && (
              <button
                onClick={() => {
                  setUploadedImages([]);
                  setFlag((prev) => !prev);
                }}
                className="button"
              >
                Reset
              </button>
            )}
            {/* Generates PDF */}
            <button
              onClick={() => {
                handleGeneratePdfFromImages();
                setFlag((prev) => !prev);
              }}
              className="button"
            >
              Export to PDF
            </button>
          </div>
        </>
      ) : (
        <p>Upload some images...</p>
      )}
    </>
  );
}

export default App;
