const recordBtn = document.getElementById('record-btn')
const fileInput = document.getElementById('file-input');
const processMenu = document.getElementById('process-menu')
const processBtn = document.getElementById('process-btn')
const scaleAmtInput = document.getElementById('scale-amt-input')
const processing = document.getElementById('processing')
const optionWrapper = document.getElementById('option-wrapper')

const recordTimeInput = document.getElementById('record-time-input')
const recordTimeDisplay = document.getElementById('record-time-display')
recordTimeInput.oninput = () => {
    recordTimeDisplay.innerHTML = recordTimeInput.value + 's'
}

const durationInput = document.getElementById('duration-input')
const durationDisplay = document.getElementById('duration-display')

const sampleRate = 44100
const worker = new Worker('./pitchChanger.js')

recordBtn.onclick = () => {
    const voiceRecorder = new VoiceRecorder(sampleRate)
    setTimeout(() => {
        createVocoder(voiceRecorder.getAudioData())
    }, parseInt(recordTimeInput.value) * 1000);
}

worker.onmessage = (e) => {
    switch(e.data.method){
        case 'initialized':
            processing.style.display = 'none'
            processMenu.style.display = 'block'
            break;
        case 'audioReady':
            processing.style.display = 'none'
            processMenu.style.display = 'block'
            playback(e.data.data)
            break;
    }
}

fileInput.addEventListener('change', (e) => {
    const fileData = e.target.files[0]
    const audioCtx = new AudioContext({sampleRate: sampleRate})
    const fileReader = new FileReader()
    
    fileReader.onload = (e) => {
    	audioCtx.decodeAudioData(e.target.result).then(buffer => {
            const f32 = buffer.getChannelData(0)
            const arr = []
            for(var i = 0; i < f32.length; i++)arr.push(f32[i])
            createVocoder(arr)
        })
    }
   	fileReader.readAsArrayBuffer(fileData)
})

const semitoneShiftDisplay = document.getElementById('semitone-shift-display')
scaleAmtInput.oninput = () => {
    semitoneShiftDisplay.innerHTML = scaleAmtInput.value
}

function createVocoder (arr){
    processing.style.display = 'block'
    optionWrapper.style.display = 'none'
    worker.postMessage({method: 'init', data: arr})
    processBtn.onclick = () =>{
        processMenu.style.display = 'none'
        processing.style.display = 'block'
        worker.postMessage({method: 'pitchChange', data: scaleAmtInput.value})
    }
}
