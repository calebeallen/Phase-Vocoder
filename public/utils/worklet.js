class recorder extends AudioWorkletProcessor {
    constructor() {
      super()
    }
    
    process(input, output) {
      this.port.postMessage(input[0][0])
    //   for(var i = 0; i < 128; i++){
    //     output[0][0][i] = input[0][0][i]
    //     output[0][1][i] = input[0][0][i]
    //   }     
      return true
    }
}
  
registerProcessor("recorder", recorder);