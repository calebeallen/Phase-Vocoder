const sampleRate = 44100
const fftSize = 1024
const windowOverlap = 4
const hopSize = fftSize / windowOverlap
const hannWindow = []
var amtOfFrames;

var originalAudioData;
for(var i = 0; i < fftSize; i++) hannWindow.push(0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize)))

const fftArr = []

addEventListener('message', e => {
  const data = e.data.data
  switch(e.data.method){
    case 'init':
      init(data)
      break;
    case 'pitchChange':
      pitchChange(data)
      break;
  }
})

function init(audioData){
  //splice all zeros at beginning of audiodata arr
  var foundNonZero = false
  while(!foundNonZero){
    if(audioData[0] == 0)
      audioData.splice(0,1)
    else foundNonZero = true
  }
  var amtToSplice = audioData.length % hopSize
  audioData.splice(audioData.length - amtToSplice - 1, amtToSplice)
  const subtractHops = windowOverlap - 1 - ((audioData.length % fftSize) / hopSize)
  amtOfFrames = Math.floor(audioData.length / fftSize) * 4 - subtractHops
  originalAudioData = audioData
  postMessage({method: 'initialized'})
}

function pitchChange(scaleAmt){
    scaleAmt = Math.pow(2, scaleAmt / 12)

    const lastPhase = new Array(fftSize / 2 + 1).fill(0)
    const accumPhase = new Array(fftSize / 2 + 1).fill(0)
    const aMags = new Array(fftSize / 2 + 1).fill(0)
    const aFreqs = new Array(fftSize / 2 + 1).fill(0)
    const rebuiltSignal = new Array(amtOfFrames * hopSize + fftSize - hopSize).fill(0)
    const sMags = [] 
    const sFreqs = []
    const outputFrame = []

    const binFreq = 2 * Math.PI * hopSize / fftSize
    
    for(var i = 0; i < amtOfFrames; i++){
      var frame = fft(doWindow(originalAudioData.slice(i * hopSize, i * hopSize + fftSize)))
      for(var k = 0; k <= fftSize / 2; k++){
        sMags[k] = 0
        sFreqs[k] = 0
      }
      
      for(var k = 0; k <= fftSize / 2; k++){
        //get phase
        const phase = Math.atan2(frame[k * 2 + 1], frame[k * 2])
        //get fractional bin
        var binDev = phase - lastPhase[k]
        binDev -= binFreq * k 
        binDev = wrap(binDev)
        binDev *= fftSize / hopSize / (2 * Math.PI)
        //add fractional bin to bin k
        aFreqs[k] = k + binDev
        aMags[k] = Math.sqrt(frame[k * 2] * frame[k * 2] + frame[k * 2 + 1] * frame[k * 2 + 1])
        lastPhase[k] = phase
      }

      //shift partials based on scale amount
      for(var k = 0; k <= fftSize / 2; k++){
        const n = Math.round(k * scaleAmt)
        if(n <= fftSize / 2){
          sMags[n] += aMags[k]
          sFreqs[n] = aFreqs[k] * scaleAmt
        }
      }

      for(var k = 0; k <= fftSize / 2; k++){
        const amp = sMags[k]
        //reverse analysis to get new phase
        var phase = sFreqs[k] - k
        phase *= 2 * Math.PI * hopSize / fftSize
        phase += binFreq * k
        accumPhase[k] = wrap(accumPhase[k] + phase)
        //create new complex vector with new phase
        //interchange array for ifft
        outputFrame[k * 2] = amp * Math.sin(accumPhase[k]) 
        outputFrame[k * 2 + 1] = amp * Math.cos(accumPhase[k])
        //account for complex conjugate
        if(k > 0 && k < fftSize){
          outputFrame[fftSize * 2 - k * 2] = -outputFrame[k * 2]
          outputFrame[fftSize * 2 - k * 2 + 1] = outputFrame[k * 2 + 1]
        } 
      }
      
      frame = ifft(outputFrame)
      for(var k = 0; k < frame.length; k++)
        rebuiltSignal[i * hopSize + k] += frame[k] * hannWindow[k]
    }
    postMessage({method: 'audioReady', data: rebuiltSignal})
}


function doWindow(data){
  const arr = []
  for(var i = 0; i < fftSize; i++) 
    arr.push(data[i] * hannWindow[i])   
  return arr
}

function wrap(val){
  if (val >= 0) 
    return ((val + Math.PI) % (2 * Math.PI)) - Math.PI
  else 
    return ((val - Math.PI) % (-2 * Math.PI)) + Math.PI
}

function fft(data, complex){
  const X = [], E = [], O = []
  var N = data.length
  if(complex){
      N /= 2
      if(N == 1) return [data[0],data[1]]
      for(var i = 0; i < N; i++){
          if(i % 2 == 0){
            E.push(data[i * 2])
            E.push(data[i * 2 + 1]) 
          }else{
            O.push(data[i * 2])
            O.push(data[i * 2 + 1])
          }
      }
  }else{
      if(N == 1) return [data[0],0]
      for(var i = 0; i < N; i++){
          if(i % 2 == 0){
            E.push(data[i])
          }else{
            O.push(data[i])
          }
      }
  }
  const evens = fft(E, complex)
  const odds = fft(O, complex)
  
  for(var k = 0; k < N / 2; k++){
    const arg = -2 * Math.PI * (k / N)
    const e = [Math.cos(arg), Math.sin(arg)]
    const eOdd = [e[0] * odds[k * 2] - e[1] * odds[k * 2 + 1], e[0] * odds[k * 2 + 1] + e[1] * odds[k * 2]]
    
    X[k * 2] = evens[k * 2] + eOdd[0]  
    X[k * 2 + 1] = evens[k * 2 + 1] + eOdd[1]
    X[N + k * 2] = evens[k * 2] - eOdd[0] 
    X[N + k * 2 + 1] = evens[k * 2 + 1] - eOdd[1]
  }   
  return X
}


function ifft(data){
    const IntrChngeIfft = fft(data, true)
    const real = []
    for(var i = 0; i < IntrChngeIfft.length / 2; i++)
      real.push(IntrChngeIfft[i * 2 + 1] / (IntrChngeIfft.length / 2))
    return real
}



