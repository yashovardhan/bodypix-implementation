# BodyPix Implementation

This is an implmentation of the Tensorflow.js module BodyPix. It is an Open Source Machine Learning module for person and body segmentation within the browser. This specific implmentation allows person segmentation.

Person segmentation segments an image into pixels that are and aren't part of a person. It returns a binary array with 1 for the pixels that are part of the person, and 0 otherwise. The array size corresponds to the number of pixels in the image. An image is fed through a pre-trained model. The model corresponds to a MobileNet V1 architecture with a specific multiplier.

# Running the code
1. Install the dependencies using `npm install`
2. To watch a live demo of the application use `npm run watch` (allow camera permissions within the browser)
3. To build the project as a whole in production mode use `npm run build`