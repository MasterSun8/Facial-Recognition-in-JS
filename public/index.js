const vid = document.getElementById('vid')
const select = document.getElementById("cam");
const username = document.getElementById("name");
var noname = 0
let faceMatcher, canvas, displaySize

let constraints = {
    video: {
        facingMode: "environment"
    }
}

if (!navigator.mediaDevices?.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
} else {
    navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
            devices.forEach((device) => {
                if (device.kind == "videoinput") {
                    let option = document.createElement("option")
                    option.text = device.label
                    option.value = device.deviceId
                    select.appendChild(option)
                }
            });
        })
        .catch((err) => {
            console.error(`${err.name}: ${err.message}`);
        })
}

function startWebcam() {
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
            vid.srcObject = stream
        })
        .catch(error => {
            console.error(error.name + ': ' + error.message)
        })
}

Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("/weights"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/weights"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/weights")
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
    /*
        let users = await fetch('users.txt')
        users = await users.text()
        users = users.split('\r\n')
        return Promise.all(
            users.map(async label => {
                const descriptions = new Array()
                for (let i = 0; i < 5; i++) {
                    const img = await faceapi.fetchImage(`./users/${label}/${i}.jpg`)
                    const detections = await faceapi
                        .detectSingleFace(img)
                        .withFaceLandmarks()
                        .withFaceDescriptor()
                    try {
                        descriptions.push(detections.descriptor);
                        console.log(`all good on ${label}${i}`)
                    } catch {
                        console.error(`fuck up on ${label}${i}`)
                    }
                }
                try {
                    let t = new faceapi.LabeledFaceDescriptors(label, descriptions)
                    console.log(`all good on ${label}`)
                    return t
                } catch {
                    console.error(`fuck up on ${label}`)
                }
            })
        )
    /**/
}

vid.addEventListener("play", async () => {
    const labeledFaceDescriptors = await getLabeledFaceDescriptions();
    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

    canvas = faceapi.createCanvasFromMedia(vid)
    document.body.append(canvas)

    displaySize = { width: vid.clientWidth, height: vid.clientHeight };
    faceapi.matchDimensions(canvas, displaySize)

    recognize()
});

async function recognize() {
    const detections = await faceapi.detectAllFaces(vid).withFaceLandmarks().withFaceDescriptors()

    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor)
    })

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height)

    results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box
        const drawBox = new faceapi.draw.DrawBox(box, {
            label: result,
        })
        drawBox.draw(canvas)
    })
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