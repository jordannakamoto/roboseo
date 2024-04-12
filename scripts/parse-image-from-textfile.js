// Parse text from image file
// Cut off content before first h1 or h2 occurrence
// Highlight H1
// Highlight H2

// Use dynamic import to load the ES Module
import("/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/node_modules/textifyimage/index.js")
  .then((module) => {
    // Now, you can access the imported module
    const { extractTextFromImage } = module;
    var text = extractTextFromImage("/Users/jordannakamoto/Desktop/testimage.jpg");

    text
      .then((data) => {
        console.log(data); // Output the extracted text
      })
      .catch((error) => {
        console.log(error); // Handle any errors
      });
  })
  .catch((error) => {
    console.error(error); // Handle any errors related to dynamic import
  });