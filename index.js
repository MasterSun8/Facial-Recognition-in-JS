const user = document.getElementById('user')
const realLimit = 2
var limit = 0
const loader = document.getElementById("load")
const frames = document.getElementById("fps")
let lastFrame
let FPS = 0
let tempUs = ''
let same = 0
let us = ''
let spect = 0
let counter = 0
let spectlist = new Array()
const vid = document.getElementById('vid')
const select = document.getElementById("cam");
const username = document.getElementById("name");
var noname = 0
let faceMatcher, canvas, displaySize

let constraints = {
    video: {
        facingMode: "user"
    }
}

function onChange() {
    console.log(select.value)
    constraints.video.deviceId = select.value
    startWebcam()
}

select.onchange = onChange;

if (!navigator.mediaDevices?.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
} else {
    navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
            devices.forEach((device) => {
                if (device.kind == "videoinput") {
                    let option = document.createElement("option");
                    option.text = device.label;
                    option.value = device.deviceId;
                    select.appendChild(option);
                }
            });
        })
        .catch((err) => {
            document.body.innerHTML += error.name + ': ' + error.message
            console.error(`${err.name}: ${err.message}`);
        });
}

function startWebcam() {
    vid.srcObject?.getTracks().forEach(track => track.stop());
    let devices = navigator.mediaDevices;
    if (devices && 'getUserMedia' in devices) {
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(stream => {
                vid.autoplay = true;
                vid.srcObject = stream
                if (loader) {
                    loader.remove()
                }
            })
            .catch(error => {
                user.innerHTML = error.name + ': ' + error.message
                console.error(error.name + ': ' + error.message)
            })
    }
}

Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("weights"),
    faceapi.nets.faceLandmark68Net.loadFromUri("weights"),
    faceapi.nets.faceRecognitionNet.loadFromUri("weights")
])
    .then(startWebcam)/*
    .then(getLabeledFaceDesriptions()
        .then(x => console.log(x))
    )/**/



async function getLabeledFaceDescriptions() {
    let faces = new Array()
    Object.keys(localStorage).forEach(label => {
        faces.push(localStorage.getItem(label))
    })
    console.log(faces)
    return Promise.all(
        faces.map(async (val, label) => {
            label = label.toString()
            var value = new Image();
            value.src = val;

            const descriptions = new Array()
            const detections = await faceapi
                .detectSingleFace(value)
                .withFaceLandmarks()
                .withFaceDescriptor()
            try {
                descriptions.push(detections.descriptor)
                console.log(`all good on ${label}`)
            } catch {
                console.error(`fuck up on ${label}`)
            }
            try {
                let user = Object.keys(localStorage)[label]
                let t = new faceapi.LabeledFaceDescriptors(user, descriptions)
                console.log(`all good on ${label}`)
                return t
            } catch {
                console.error(`fuck up on ${label}`)
            }
        })
    )
}

vid.addEventListener("play", async () => {
    const labeledFaceDescriptors = await getLabeledFaceDescriptions();
    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

    canvas = faceapi.createCanvasFromMedia(vid)
    document.body.append(canvas)

    displaySize = { width: vid.clientWidth, height: vid.clientHeight };
    faceapi.matchDimensions(canvas, displaySize)

    lastFrame = Date.now()
    recognize()
});

async function recognize() {
    const detections = await faceapi.detectAllFaces(vid).withFaceLandmarks().withFaceDescriptors()

    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor)
    })

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height)

    let len = results.length
    if (len > 1) {
        spect++
        if (spect > 3) {
            document.body.style.backgroundColor = '#5555FF'
        }
    } else {
        spect = 0
    }

    if (!results[0]) {
        counter++
        if (counter > limit * 3) {
            document.body.style.backgroundColor = '#AAAAAA'
        }
    }

    results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box
        const drawBox = new faceapi.draw.DrawBox(box, {
            label: result,
        })
        drawBox.draw(canvas)
        if (us == '') {
            if (tempUs != result['_label']) {
                tempUs = result['_label']
            } else {
                same++
            }
            if (same > 10) {
                us = result['_label']
                user.innerHTML = us
            }
        }
        if (us != result['_label'] && us != '') {
            if (counter > limit) {
                document.body.style.backgroundColor = '#FF0000'
                console.log(`You are not ${us} you are ${result['_label']}`)
            } else {
                counter++
            }
        } else {
            counter = 0
            if (spect == 0) {
                if(document.body.style?.backgroundColor){
                    document.body.style.removeProperty(backgroundColor)
                }
            }
        }
    })

    FPS += 1000 / (Date.now() - lastFrame)
    FPS = Math.round(FPS * 50) / 100
    limit = realLimit * FPS
    frames.innerHTML = `FPS: ${FPS}`
    lastFrame = Date.now()

    setTimeout(recognize, 1)
}

function capture(video) {
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL()
}

function addImage() {
    imgData = capture(vid)
    localStorage.setItem(username.value, imgData)
    location.reload()
}

function delLocalStorage() {
    localStorage.clear()
}