export interface AudioControlState {
  leftEnabled: boolean;
  rightEnabled: boolean;
  audioBalance: number;
  equalizerBands: number[];
  surroundVirtualiser: boolean;
  volumeLeveller: boolean;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private destinationNode: AudioNode | null = null;
  private leftGainNode: GainNode | null = null;
  private rightGainNode: GainNode | null = null;
  private stereoPannerNode: StereoPannerNode | null = null;
  private equalizerNodes: BiquadFilterNode[] = [];
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isInitialized = false;
  private currentAudioElement: HTMLAudioElement | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Audio not supported');
    }
  }

  async connectToAudioElement(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (!this.audioContext) throw new Error('Audio context not available');

    try {
      // Disconnect previous audio element if exists
      if (this.currentAudioElement && this.sourceNode) {
        this.sourceNode.disconnect();
      }

      this.currentAudioElement = audioElement;
      
      // Create source node from audio element
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);

      // Create the audio processing chain
      this.setupAudioChain();

      console.log('Audio element connected successfully');
    } catch (error) {
      console.error('Failed to connect audio element:', error);
      throw new Error('Failed to connect audio source');
    }
  }

  private setupAudioChain(): void {
    if (!this.audioContext || !this.sourceNode) return;

    // Create master gain node
    this.masterGainNode = this.audioContext.createGain();

    // Create channel splitter and merger for left/right control
    this.splitterNode = this.audioContext.createChannelSplitter(2);
    this.mergerNode = this.audioContext.createChannelMerger(2);

    // Create left and right gain nodes
    this.leftGainNode = this.audioContext.createGain();
    this.rightGainNode = this.audioContext.createGain();

    // Create stereo panner for balance control
    this.stereoPannerNode = this.audioContext.createStereoPanner();

    // Create equalizer filter nodes (10-band)
    this.equalizerNodes = [];
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    for (let i = 0; i < 10; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking';
      filter.frequency.value = frequencies[i];
      filter.Q.value = 1;
      filter.gain.value = 0;
      this.equalizerNodes.push(filter);
    }

    // Create compressor for volume leveling
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // Connect the audio chain
    this.connectAudioNodes();
  }

  private connectAudioNodes(): void {
    if (!this.sourceNode || !this.audioContext) return;

    let currentNode: AudioNode = this.sourceNode;

    // Connect through equalizer
    this.equalizerNodes.forEach(filter => {
      currentNode.connect(filter);
      currentNode = filter;
    });

    // Connect to compressor if volume leveller is enabled
    currentNode.connect(this.compressorNode!);
    currentNode = this.compressorNode!;

    // Connect to master gain
    currentNode.connect(this.masterGainNode!);
    currentNode = this.masterGainNode!;

    // Split channels for individual control
    currentNode.connect(this.splitterNode!);

    // Connect left and right channels through gain nodes
    this.splitterNode!.connect(this.leftGainNode!, 0);
    this.splitterNode!.connect(this.rightGainNode!, 1);

    // Merge channels back
    this.leftGainNode!.connect(this.mergerNode!, 0, 0);
    this.rightGainNode!.connect(this.mergerNode!, 0, 1);

    // Connect to stereo panner for balance
    this.mergerNode!.connect(this.stereoPannerNode!);

    // Connect to destination
    this.stereoPannerNode!.connect(this.audioContext.destination);
  }

  updateControls(state: AudioControlState): void {
    if (!this.isInitialized) return;

    // Update left/right enable state
    if (this.leftGainNode) {
      this.leftGainNode.gain.value = state.leftEnabled ? 1 : 0;
    }
    if (this.rightGainNode) {
      this.rightGainNode.gain.value = state.rightEnabled ? 1 : 0;
    }

    // Update audio balance (-1 = full left, 0 = center, 1 = full right)
    if (this.stereoPannerNode) {
      const panValue = state.audioBalance / 100; // Convert from -100/100 to -1/1
      this.stereoPannerNode.pan.value = Math.max(-1, Math.min(1, panValue));
    }

    // Update equalizer
    this.equalizerNodes.forEach((filter, index) => {
      if (index < state.equalizerBands.length) {
        // Convert from 0-100 to -12/+12 dB
        const gainValue = (state.equalizerBands[index] - 50) * 0.24;
        filter.gain.value = gainValue;
      }
    });

    // Update compressor bypass for volume leveller
    if (this.compressorNode && this.masterGainNode) {
      if (state.volumeLeveller) {
        // Compressor is already in the chain
        this.compressorNode.threshold.value = -24;
      } else {
        // Disable compressor by setting threshold very high
        this.compressorNode.threshold.value = 0;
      }
    }
  }

  disconnect(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.equalizerNodes.forEach(node => node.disconnect());
    this.equalizerNodes = [];
    
    if (this.leftGainNode) {
      this.leftGainNode.disconnect();
      this.leftGainNode = null;
    }
    
    if (this.rightGainNode) {
      this.rightGainNode.disconnect();
      this.rightGainNode = null;
    }
    
    if (this.stereoPannerNode) {
      this.stereoPannerNode.disconnect();
      this.stereoPannerNode = null;
    }
    
    if (this.splitterNode) {
      this.splitterNode.disconnect();
      this.splitterNode = null;
    }
    
    if (this.mergerNode) {
      this.mergerNode.disconnect();
      this.mergerNode = null;
    }
    
    if (this.compressorNode) {
      this.compressorNode.disconnect();
      this.compressorNode = null;
    }
    
    if (this.masterGainNode) {
      this.masterGainNode.disconnect();
      this.masterGainNode = null;
    }

    this.currentAudioElement = null;
    console.log('Audio engine disconnected');
  }

  async createDemoAudioSource(): Promise<HTMLAudioElement> {
    // Create a demo audio element for testing
    const audio = new Audio();
    
    // Create a simple oscillator tone for demo
    if (this.audioContext) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1; // Low volume
      
      // Create a brief tone for testing
      oscillator.connect(gainNode);
      
      // We'll use a MediaElementAudioSourceNode instead
      // Let's create a simple audio file URL or use a test tone
      
      // For demo purposes, we can use a data URL with a simple sine wave
      // Or we can connect to any existing audio on the page
    }
    
    return audio;
  }

  getCurrentAudioElement(): HTMLAudioElement | null {
    return this.currentAudioElement;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

// Global audio engine instance
export const audioEngine = new AudioEngine();
