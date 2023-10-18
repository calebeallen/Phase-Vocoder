class VoiceRecorder{
    constructor(sampleRate){
        this.audioCtx = new AudioContext({sampleRate: sampleRate})
        this.audioData = []
        navigator.mediaDevices.getUserMedia({audio: true}).then( async stream => {
            await this.audioCtx.audioWorklet.addModule('./utils/worklet.js')
            const inputProcessor = new AudioWorkletNode(this.audioCtx, 'recorder')
            const input = this.audioCtx.createMediaStreamSource(stream)
            input.connect(inputProcessor)
            //inputProcessor.connect(this.audioCtx.destination)
            inputProcessor.port.onmessage = (e) => {
                for(var i = 0; i < 128; i++){
                    this.audioData.push(e.data[i])
                }
            }
        })
    }

    getAudioData(){
        this.audioCtx.close()
        return this.audioData
    }
}

function playback(data){
    const float = Float32Array.from(data)
    const audioCtx = new AudioContext({sampleRate: sampleRate})
    const audioBuf = audioCtx.createBuffer(1, float.buffer.byteLength, sampleRate)
    var nowBuffering = audioBuf.getChannelData(0)
    for(var i = 0; i < audioBuf.length; i++){
        nowBuffering[i] = float[i]
    }
    const playback = audioCtx.createBufferSource();
    playback.buffer = audioBuf;
    playback.connect(audioCtx.destination);
    playback.start();
    setTimeout(() => {
        audioCtx.close();
    }, data.length / sampleRate * 1000);
}




