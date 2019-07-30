import * as bodyPix from '@tensorflow-models/body-pix';
import * as partColorScales from './color-scales';

const state = {
    video : null,
    stream: null,
    net: null,
    videoConstraints: {},
    changingCamera: false,
    changingArchitecture: false,
}

function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
    return isAndroid() || isiOS();
}

async function getVideoInputs() {
    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log('enumerateDevices() not supported');
        return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter((device) => device.kind === 'videoinput');

    return videoDevices;
}

function stopExistingVideoCapture() {
    if (state.video && state.video.srcObject) {
        state.video.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
        state.video.srcObject = null;
    }
}

async function getDeviceForLabel(cameraLabel) {
    const videoInputs = await getVideoInputs();

    for (let i = 0; i < videoInputs.length; i++) {
        const videoInput = videoInputs[i];
        if (videoInput.label === cameraLabel) {
            return videoInput.deviceId;
        }
    }

    return null;
}

function getFacingMode(cameraLabel) {
    if(!cameraLabel) {
        return 'user';
    }
    if (cameraLabel.toLowerCase().includes('back')) {
        return 'environment';
    }
    else {
        return 'user';
    }
}

async function getConstraints(cameraLabel) {
    let deviceId, facingMode;

    if (cameraLabel) {
        deviceId = await getDeviceForLabel(cameraLabel);
        facingMode = isMobile() ? getFacingMode(cameraLabel) : null;
    };
    return { deviceId, facingMode };
}

async function setupCamera(cameraLabel) {
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available'
        );
    }

    const videoElement = document.getElementById('video');

    stopExistingVideoCapture();

    const videoConstraints = await getConstraints(cameraLabel);

    const stream = await navigator.mediaDevices.getUserMedia(
        {'audio': false, 'video': videoConstraints}
    );
    videoElement.srcObject = stream;

    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            videoElement.width = videoElement.videoWidth;
            videoElement.height = videoElement.videoHeight;
            resolve(videoElement);
        };
    });
}

async function loadVideo(cameraLabel) {
    try {
        state.video = await setupCamera(cameraLabel);
    } catch (e) {
        let info = document.getElementById('info');
        info.textContent = 'this browser does not support video capture,' +
            'or this device does not have a camera';
        info.style.display = 'block';
        throw e;
    }

    state.video.play();
}

const guiState = {
    estimate: 'segmentation',
    camera: null,
    flipHorizontal: true,
    input: {
        mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
        outputStride: 16
    },
    segmentation: {
        segmentationThreshold: 0.5,
        effect: 'mask',
        maskBackground: true,
        opacity: 0.7,
        backgroundBlurAmount: 3,
        maskBlurAmount: 0,
        edgeBlurAmount: 3,
    },
    partMap: {
        colorScale: 'rainbow',
        segmentationThreshold: 0.5,
        applyPixelation: false,
        opacity: 0.9,
    },
    showFps: false,
};


function segmentBodyInRealTime() {
    const canvas = document.getElementById('output');
    
    async function bodySegmentationFrame() {
        if(state.changingArchitecture || state.changingCamera) {
            setTimeout(bodySegmentationFrame, 1000);
            return;
        }

        const outputStride = +guiState.input.outputStride;
        const flipHorizontal = guiState.flipHorizontal;

        const personSegmentation = await state.net.estimatePersonSegmentation(
            state.video,
            outputStride,
            guiState.segmentation.segmentationThreshold
        );
        const mask = bodyPix.toMaskImageData(
            personSegmentation, guiState.segmentation.maskBackground
        );
        bodyPix.drawMask(
            canvas,
            state.video,
            mask,
            guiState.segmentation.opacity,
            guiState.segmentation.maskBlurAmount,
            flipHorizontal
        );

        requestAnimationFrame(bodySegmentationFrame);
    }
    bodySegmentationFrame();
}

export async function bindPage() {
    state.net = await bodyPix.load(+guiState.input.mobileNetArchitecture);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').style.display = 'inline-block';

    await loadVideo();

    segmentBodyInRealTime();
}

navigator.getUserMedia = 
    navigator.getUserMedia || 
    navigator.webkitGetUserMedia || 
    navigator.mozGetUserMedia;

bindPage();
