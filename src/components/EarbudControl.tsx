import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { audioEngine, AudioControlState } from "@/lib/audioEngine";
import { Bluetooth, BluetoothConnected, Battery, Volume2, Power, MoreVertical, ArrowLeft, Settings, Scan, Trash2, RefreshCw, Info } from "lucide-react";

interface BluetoothDevice {
  id: string;
  name: string;
  type: 'earbuds' | 'headphones' | 'speaker' | 'unknown';
  isConnected: boolean;
  isPaired: boolean;
  batteryLevel?: number;
  leftBattery?: number;
  rightBattery?: number;
  caseBattery?: number;
  rssi?: number;
}

interface EarbudState {
  selectedDevice: BluetoothDevice | null;
  leftEnabled: boolean;
  rightEnabled: boolean;
  audioBalance: number;
  isScanning: boolean;
  bluetoothSupported: boolean;
}

interface EqualizerState {
  sliders: number[]; // 10 band equalizer
  preset: 'manual' | 'brilliant-treble' | 'bass-boost' | 'vocal-boost';
  surroundVirtualiser: boolean;
  volumeLeveller: boolean;
}

const EarbudControl = () => {
  const { toast } = useToast();
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [currentView, setCurrentView] = useState<'devices' | 'settings'>('devices');
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([]);
  const [earbudState, setEarbudState] = useState<EarbudState>({
    selectedDevice: null,
    leftEnabled: true,
    rightEnabled: true,
    audioBalance: 0,
    isScanning: false,
    bluetoothSupported: 'bluetooth' in navigator && window.isSecureContext,
  });

  const [equalizerState, setEqualizerState] = useState<EqualizerState>({
    sliders: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], // 10 bands at 50% (center)
    preset: 'manual',
    surroundVirtualiser: true,
    volumeLeveller: true,
  });

  // Demo device for when Bluetooth is not supported
  const addDemoDevice = () => {
    const demoDevice: BluetoothDevice = {
      id: 'demo_device',
      name: 'Demo Audio Device',
      type: 'earbuds',
      isConnected: false,
      isPaired: true,
      rssi: -45
    };

    setAvailableDevices(prev => {
      const exists = prev.find(d => d.id === demoDevice.id);
      if (!exists) {
        return [...prev, demoDevice];
      }
      return prev;
    });

    toast({
      title: "Demo Device Added",
      description: "Demo device added! You can explore all app features. Real Bluetooth requires HTTPS and compatible browser.",
    });
  };

  // Real-time device scanning
  const scanForDevices = async () => {
    // If Bluetooth is not supported, add demo device instead
    if (!earbudState.bluetoothSupported) {
      addDemoDevice();
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.protocol !== 'https:') {
      toast({
        title: "HTTPS Required",
        description: "Web Bluetooth requires a secure connection (HTTPS). Try using the demo device instead.",
        variant: "destructive",
      });
      addDemoDevice();
      return;
    }

    // Check browser compatibility
    if (!navigator.bluetooth) {
      toast({
        title: "Browser Not Supported",
        description: "This browser doesn't support Web Bluetooth. Try Chrome, Edge, or Opera.",
        variant: "destructive",
      });
      addDemoDevice();
      return;
    }

    setEarbudState(prev => ({ ...prev, isScanning: true }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });

      const newDevice: BluetoothDevice = {
        id: device.id || `device_${Date.now()}`,
        name: device.name || 'Unknown Device',
        type: detectDeviceType(device.name || ''),
        isConnected: false,
        isPaired: true,
        rssi: -50
      };

      setAvailableDevices(prev => {
        const exists = prev.find(d => d.id === newDevice.id);
        if (exists) return prev;
        return [...prev, newDevice];
      });

      toast({
        title: "Device Found",
        description: `Found ${newDevice.name}`,
      });

    } catch (bluetoothError: any) {
      console.log('Bluetooth access denied or cancelled:', bluetoothError);

      let errorTitle = "Connection Failed";
      let errorDescription = "Unable to connect to Bluetooth device.";

      // Check for specific error types
      if (bluetoothError.name === 'NotAllowedError') {
        errorTitle = "Permission Denied";
        errorDescription = "Bluetooth permission was denied. Please allow Bluetooth access in your browser settings.";
      } else if (bluetoothError.name === 'NotSupportedError') {
        errorTitle = "Not Supported";
        errorDescription = "Web Bluetooth is not supported in this browser. Try Chrome or Edge.";
      } else if (bluetoothError.name === 'SecurityError') {
        errorTitle = "Security Error";
        errorDescription = "Bluetooth requires HTTPS. This may not work on HTTP connections.";
      } else if (bluetoothError.name === 'NotFoundError') {
        errorTitle = "No Devices Found";
        errorDescription = "No Bluetooth devices found. Make sure your device is discoverable.";
      } else if (bluetoothError.message && bluetoothError.message.includes('cancelled')) {
        errorTitle = "Scan Cancelled";
        errorDescription = "Device scan was cancelled by user.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      // Add delay to show scanning animation
      setTimeout(() => {
        setEarbudState(prev => ({ ...prev, isScanning: false }));
      }, 1500);
    }
  };



  const detectDeviceType = (name: string): BluetoothDevice['type'] => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('earbud') || lowerName.includes('airpods') || lowerName.includes('buds')) {
      return 'earbuds';
    }
    if (lowerName.includes('headphone') || lowerName.includes('headset')) {
      return 'headphones';
    }
    if (lowerName.includes('speaker')) {
      return 'speaker';
    }
    return 'unknown';
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      // Simulate connection process
      setEarbudState(prev => ({ ...prev, isScanning: true }));

      // Initialize audio engine when connecting
      await initializeAudioEngine();

      // In real implementation, this would connect to the actual device
      await new Promise(resolve => setTimeout(resolve, 1500));

      const connectedDevice: BluetoothDevice = {
        ...device,
        isConnected: true,
        // Add demo battery levels for demo device
        leftBattery: device.id === 'demo_device' ? 85 : device.leftBattery,
        rightBattery: device.id === 'demo_device' ? 78 : device.rightBattery,
        caseBattery: device.id === 'demo_device' ? 92 : device.caseBattery,
      };

      setConnectedDevices(prev => [...prev.filter(d => d.id !== device.id), connectedDevice]);
      setAvailableDevices(prev => prev.filter(d => d.id !== device.id));
      setEarbudState(prev => ({
        ...prev,
        selectedDevice: connectedDevice,
        isScanning: false
      }));

      // Start battery monitoring
      startBatteryMonitoring(connectedDevice.id);

      toast({
        title: "Device Connected",
        description: `Successfully connected to ${device.name}`,
      });

    } catch (error) {
      console.error('Failed to connect:', error);
      setEarbudState(prev => ({ ...prev, isScanning: false }));
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${device.name}`,
        variant: "destructive",
      });
    }
  };

  const disconnectDevice = (device: BluetoothDevice) => {
    // Stop any playing audio and disconnect audio engine
    const audio = audioEngine.getCurrentAudioElement();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audioEngine.disconnect();
    setIsAudioInitialized(false);
    setIsPlayingDemo(false);

    const disconnectedDevice: BluetoothDevice = {
      ...device,
      isConnected: false,
      leftBattery: undefined,
      rightBattery: undefined,
      caseBattery: undefined,
    };

    setAvailableDevices(prev => [...prev, disconnectedDevice]);
    setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
    setEarbudState(prev => ({
      ...prev,
      selectedDevice: prev.selectedDevice?.id === device.id ? null : prev.selectedDevice
    }));

    toast({
      title: "Device Disconnected",
      description: `Disconnected from ${device.name}. Audio controls disabled.`,
    });
  };

  const startBatteryMonitoring = (deviceId: string) => {
    // Battery monitoring would be implemented with real device API
    console.log(`Starting battery monitoring for device: ${deviceId}`);
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return "battery-high";
    if (level > 30) return "battery-medium";
    if (level > 15) return "battery-low";
    return "battery-critical";
  };

  const clearAllDevices = () => {
    setAvailableDevices([]);
    setConnectedDevices([]);
    setEarbudState(prev => ({
      ...prev,
      selectedDevice: null,
      isScanning: false
    }));
  };

  const toggleLeft = () => {
    setEarbudState(prev => {
      const newLeftEnabled = !prev.leftEnabled;
      const newState = {
        ...prev,
        leftEnabled: newLeftEnabled
      };

      // Show battery drain when disabling
      if (!newLeftEnabled && prev.selectedDevice) {
        const updatedDevice = {
          ...prev.selectedDevice,
          leftBattery: Math.max(0, (prev.selectedDevice.leftBattery || 85) - 5)
        };
        setConnectedDevices(devices =>
          devices.map(d => d.id === updatedDevice.id ? updatedDevice : d)
        );

        toast({
          title: "Left Earbud Disabled",
          description: "Left earbud powered off. Battery conserved.",
        });
      } else if (newLeftEnabled) {
        toast({
          title: "Left Earbud Enabled",
          description: "Left earbud powered on.",
        });
      }

      updateAudioControls(newState);
      return newState;
    });
  };

  const toggleRight = () => {
    setEarbudState(prev => {
      const newRightEnabled = !prev.rightEnabled;
      const newState = {
        ...prev,
        rightEnabled: newRightEnabled
      };

      // Show battery drain when disabling
      if (!newRightEnabled && prev.selectedDevice) {
        const updatedDevice = {
          ...prev.selectedDevice,
          rightBattery: Math.max(0, (prev.selectedDevice.rightBattery || 78) - 5)
        };
        setConnectedDevices(devices =>
          devices.map(d => d.id === updatedDevice.id ? updatedDevice : d)
        );

        toast({
          title: "Right Earbud Disabled",
          description: "Right earbud powered off. Battery conserved.",
        });
      } else if (newRightEnabled) {
        toast({
          title: "Right Earbud Enabled",
          description: "Right earbud powered on.",
        });
      }

      updateAudioControls(newState);
      return newState;
    });
  };

  const handleBalanceChange = (value: number[]) => {
    setEarbudState(prev => {
      const newState = {
        ...prev,
        audioBalance: value[0]
      };
      updateAudioControls(newState);
      return newState;
    });
  };

  const handleEqualizerChange = (index: number, value: number[]) => {
    const newSliders = [...equalizerState.sliders];
    newSliders[index] = value[0];
    setEqualizerState(prev => {
      const newState = {
        ...prev,
        sliders: newSliders,
        preset: 'manual'
      };
      updateAudioControls(null, newState);
      return newState;
    });
  };

  const applyPreset = (preset: EqualizerState['preset']) => {
    let newSliders = [...equalizerState.sliders];

    switch (preset) {
      case 'brilliant-treble':
        newSliders = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
        break;
      case 'bass-boost':
        newSliders = [85, 80, 75, 65, 55, 50, 45, 40, 35, 30];
        break;
      case 'vocal-boost':
        newSliders = [30, 35, 40, 60, 80, 85, 75, 60, 45, 35];
        break;
      default:
        return;
    }

    setEqualizerState(prev => {
      const newState = {
        ...prev,
        sliders: newSliders,
        preset
      };
      updateAudioControls(null, newState);
      return newState;
    });
  };

  // Audio engine integration functions
  const initializeAudioEngine = async () => {
    if (isAudioInitialized) return;

    try {
      await audioEngine.initialize();
      setIsAudioInitialized(true);

      toast({
        title: "Audio System Ready",
        description: "You can now use audio controls with any playing audio.",
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      toast({
        title: "Audio Initialization Failed",
        description: "Audio controls may not work properly.",
        variant: "destructive",
      });
    }
  };

  const updateAudioControls = (earbudStateOverride?: Partial<EarbudState>, equalizerStateOverride?: Partial<EqualizerState>) => {
    if (!isAudioInitialized || !earbudState.selectedDevice) {
      console.log('Audio controls not available - no device connected or audio not initialized');
      return;
    }

    const currentEarbudState = earbudStateOverride ? { ...earbudState, ...earbudStateOverride } : earbudState;
    const currentEqualizerState = equalizerStateOverride ? { ...equalizerState, ...equalizerStateOverride } : equalizerState;

    const audioControlState: AudioControlState = {
      leftEnabled: currentEarbudState.leftEnabled,
      rightEnabled: currentEarbudState.rightEnabled,
      audioBalance: currentEarbudState.audioBalance,
      equalizerBands: currentEqualizerState.sliders,
      surroundVirtualiser: currentEqualizerState.surroundVirtualiser,
      volumeLeveller: currentEqualizerState.volumeLeveller,
    };

    console.log('Updating audio controls:', audioControlState);
    audioEngine.updateControls(audioControlState);
  };

  const startDemoAudio = async () => {
    if (!earbudState.selectedDevice) {
      toast({
        title: "No Device Connected",
        description: "Please connect a device first to test audio controls.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!isAudioInitialized) {
        await initializeAudioEngine();
      }

      // Try to find an existing audio element on the page first
      const existingAudio = document.querySelector('audio') as HTMLAudioElement;

      if (existingAudio && existingAudio.src && !existingAudio.paused) {
        await audioEngine.connectToAudioElement(existingAudio);
        updateAudioControls();

        toast({
          title: "Connected to Existing Audio",
          description: "Audio controls are now active for the current audio source.",
        });
        return;
      }

      // Create oscillator demo since we removed external audio sources
      createOscillatorDemo();

    } catch (error) {
      console.error('Failed to start demo audio:', error);
      createOscillatorDemo();
    }
  };

  const createOscillatorDemo = async () => {
    try {
      if (!audioEngine.getAudioContext()) {
        await audioEngine.initialize();
      }

      const audioContext = audioEngine.getAudioContext();
      if (!audioContext) return;

      // Create demo tones
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440; // A4
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 554.37; // C#5

      gainNode.gain.value = 0.1;

      // Create a simple audio element that we can connect to
      const audio = document.createElement('audio');
      const mediaStreamDestination = audioContext.createMediaStreamDestination();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(mediaStreamDestination);

      audio.srcObject = mediaStreamDestination.stream;
      audio.loop = true;

      oscillator1.start();
      oscillator2.start();

      await audio.play();
      await audioEngine.connectToAudioElement(audio);
      updateAudioControls();
      setIsPlayingDemo(true);

      toast({
        title: "Test Audio Started",
        description: "Try adjusting the controls to hear the effects. Test tones will play for 30 seconds.",
      });

      // Stop after 30 seconds
      setTimeout(() => {
        oscillator1.stop();
        oscillator2.stop();
        setIsPlayingDemo(false);
      }, 30000);

    } catch (error) {
      toast({
        title: "Audio Failed",
        description: "Could not initialize audio. Controls will work with any audio playing on the page.",
        variant: "destructive",
      });
    }
  };

  const stopDemoAudio = () => {
    const audio = audioEngine.getCurrentAudioElement();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audioEngine.disconnect();
    setIsPlayingDemo(false);
    setIsAudioInitialized(false);

    toast({
      title: "Audio Stopped",
      description: "Audio controls are now inactive.",
    });
  };

  // Auto-detect and connect to any audio playing on the page
  useEffect(() => {
    const connectToPageAudio = async () => {
      if (!earbudState.selectedDevice || isPlayingDemo) return;

      const audioElements = document.querySelectorAll('audio, video');
      for (const element of audioElements) {
        const mediaElement = element as HTMLAudioElement | HTMLVideoElement;
        if (!mediaElement.paused && mediaElement.currentTime > 0) {
          try {
            if (!isAudioInitialized) {
              await initializeAudioEngine();
            }
            await audioEngine.connectToAudioElement(mediaElement);
            updateAudioControls();

            toast({
              title: "Connected to Page Audio",
              description: "Audio controls are now active for the playing media.",
            });
            break;
          } catch (error) {
            console.error('Failed to connect to page audio:', error);
          }
        }
      }
    };

    const interval = setInterval(connectToPageAudio, 2000);
    return () => clearInterval(interval);
  }, [earbudState.selectedDevice, isPlayingDemo, isAudioInitialized]);

  // Update audio controls when equalizer settings change
  const handleSurroundVirtualiserChange = (checked: boolean) => {
    setEqualizerState(prev => {
      const newState = { ...prev, surroundVirtualiser: checked };
      updateAudioControls(null, newState);
      return newState;
    });
  };

  const handleVolumeLevellerChange = (checked: boolean) => {
    setEqualizerState(prev => {
      const newState = { ...prev, volumeLeveller: checked };
      updateAudioControls(null, newState);
      return newState;
    });
  };

  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-background glass-bg-animated">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border glass-surface backdrop-blur-md sticky top-0 z-10 glass-shimmer">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCurrentView('devices')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Custom settings</h1>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8 relative">
          {/* Enhanced Dolby Equalizer */}
          <div className="space-y-6">
            {/* Enhanced Dolby Branding Header */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-2xl shadow-red-500/50">
                  <span className="text-white text-lg font-bold tracking-wider">D</span>
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-red-600 bg-clip-text text-transparent tracking-wide">
                    DOLBY ATMOS
                  </h2>
                  <div className="text-xs text-red-400 uppercase tracking-[0.2em] font-semibold">
                    SPATIAL AUDIO
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="text-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mx-auto mb-1"></div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ACTIVE</span>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Immersive Audio Processing
                  </div>
                </div>
              </div>
            </div>

            {/* EQ Grid Background */}
            <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-xl">
              {/* Grid Lines */}
              <div className="absolute inset-8 opacity-20">
                {/* Horizontal lines */}
                {[...Array(9)].map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-slate-500/30"
                    style={{ top: `${(i * 100) / 8}%` }}
                  />
                ))}
                {/* Vertical lines */}
                {[...Array(10)].map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full border-l border-slate-500/30"
                    style={{ left: `${(i * 100) / 9}%` }}
                  />
                ))}
              </div>

              {/* dB Scale */}
              <div className="absolute left-2 top-8 bottom-8 flex flex-col justify-between text-xs text-slate-400">
                <span>+12</span>
                <span>+6</span>
                <span>0</span>
                <span>-6</span>
                <span>-12</span>
              </div>

              {/* Frequency Bands */}
              <div className="flex justify-between items-end h-64 px-8 relative">
                {equalizerState.sliders.map((value, index) => {
                  const frequencies = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
                  const dbValue = ((value - 50) * 0.24).toFixed(1);

                  return (
                    <div key={index} className="flex flex-col items-center h-full group">
                      {/* dB Value Display */}
                      <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-red-500/90 text-white text-xs px-2 py-1 rounded font-mono">
                          {dbValue > 0 ? '+' : ''}{dbValue}dB
                        </div>
                      </div>

                      {/* Slider */}
                      <div className="flex-1 flex items-end pb-4 relative">
                        <Slider
                          value={[value]}
                          onValueChange={(newValue) => handleEqualizerChange(index, newValue)}
                          min={0}
                          max={100}
                          step={1}
                          orientation="vertical"
                          className="h-44 w-6 dolby-slider"
                        />

                        {/* LED-style indicator */}
                        <div
                          className="absolute right-0 w-1 bg-gradient-to-t from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-300"
                          style={{
                            height: `${(value / 100) * 176}px`,
                            bottom: '16px',
                            opacity: value > 50 ? 0.8 : 0.3
                          }}
                        />
                      </div>

                      {/* Frequency Label */}
                      <div className="text-xs text-slate-300 font-mono mt-2 rotate-45 origin-center w-8">
                        {frequencies[index]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Line (0dB) */}
              <div className="absolute left-8 right-8 border-t-2 border-red-500/60 top-1/2 pointer-events-none">
                <div className="absolute -left-6 -top-3 text-xs text-red-400 font-bold">0dB</div>
              </div>
            </div>
          </div>

          {/* Enhanced Dolby Audio Presets */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white text-sm font-bold">♪</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Dolby Audio Profiles</h3>
                <p className="text-xs text-red-400 uppercase tracking-wider">Premium Sound Experience</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  id: 'manual',
                  label: 'Custom',
                  description: 'Manual tuning',
                  icon: '🎛️',
                  gradient: 'from-slate-600 to-slate-700'
                },
                {
                  id: 'brilliant-treble',
                  label: 'Crystal',
                  description: 'Dolby Clarity',
                  icon: '💎',
                  gradient: 'from-blue-500 to-cyan-500'
                },
                {
                  id: 'bass-boost',
                  label: 'Thunder',
                  description: 'Deep Bass+',
                  icon: '⚡',
                  gradient: 'from-purple-500 to-pink-500'
                },
                {
                  id: 'vocal-boost',
                  label: 'Cinema',
                  description: 'Voice Clarity',
                  icon: '🎬',
                  gradient: 'from-green-500 to-emerald-500'
                }
              ].map((preset) => (
                <Button
                  key={preset.id}
                  variant="ghost"
                  className={`h-24 p-4 transition-all duration-500 relative overflow-hidden group ${
                    equalizerState.preset === preset.id
                      ? `bg-gradient-to-br ${preset.gradient}/20 border-2 border-red-500/60 shadow-xl shadow-red-500/30 scale-105`
                      : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10'
                  }`}
                  onClick={() => applyPreset(preset.id as EqualizerState['preset'])}
                >
                  <div className="flex flex-col items-center space-y-3 relative z-10">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{preset.icon}</div>
                    <div className="text-center">
                      <div className="font-bold text-sm uppercase tracking-wide">{preset.label}</div>
                      <div className="text-xs text-slate-400 font-medium">{preset.description}</div>
                    </div>
                  </div>

                  {/* Enhanced Active indicator */}
                  {equalizerState.preset === preset.id && (
                    <>
                      <div className="absolute top-3 right-3 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                      <div className="absolute top-3 right-3 w-4 h-4 bg-red-400 rounded-full animate-ping" />
                    </>
                  )}

                  {/* Enhanced Dolby shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/15 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1200" />

                  {/* Premium glow effect for active preset */}
                  {equalizerState.preset === preset.id && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient}/10 rounded-lg animate-pulse`} />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Enhanced Dolby Enhancement Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white text-sm font-bold">✨</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Dolby Enhancement Suite</h3>
                <p className="text-xs text-red-400 uppercase tracking-wider">Advanced Audio Technologies</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enhanced Spatial Virtualizer */}
              <Card className="p-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/60 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <span className="text-white text-lg">🌐</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-base">Dolby Atmos Virtualizer</h4>
                        <div className="text-xs text-purple-400 uppercase tracking-wider font-semibold">360° SPATIAL AUDIO</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 ml-13 leading-relaxed">
                      Revolutionary 3D audio processing delivering cinematic surround sound through any headphones
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Switch
                      checked={equalizerState.surroundVirtualiser}
                      onCheckedChange={handleSurroundVirtualiserChange}
                      className="dolby-switch"
                    />
                    <span className="text-xs text-slate-400">
                      {equalizerState.surroundVirtualiser ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Feature indicator */}
                <div className={`mt-4 h-1 rounded-full transition-all duration-500 ${
                  equalizerState.surroundVirtualiser
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg shadow-purple-500/30'
                    : 'bg-slate-600/50'
                }`} />
              </Card>

              {/* Enhanced Volume Leveller */}
              <Card className="p-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/60 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                        <span className="text-white text-lg">🎚️</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-base">Dolby Volume Leveller</h4>
                        <div className="text-xs text-green-400 uppercase tracking-wider font-semibold">INTELLIGENT DYNAMICS</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 ml-13 leading-relaxed">
                      Advanced dynamic range control ensuring consistent, optimized audio levels across all content types
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Switch
                      checked={equalizerState.volumeLeveller}
                      onCheckedChange={handleVolumeLevellerChange}
                      className="dolby-switch"
                    />
                    <span className="text-xs text-slate-400">
                      {equalizerState.volumeLeveller ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Feature indicator */}
                <div className={`mt-4 h-1 rounded-full transition-all duration-500 ${
                  equalizerState.volumeLeveller
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
                    : 'bg-slate-600/50'
                }`} />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background glass-bg-animated">
      {/* Header */}
      <div className="text-center p-6 glass-surface backdrop-blur-sm border-b border-glass-border glass-shimmer">
        <div className="flex items-center justify-center gap-3">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fe34d4a59f2d343dea48709605eb95b58%2Fe6b0d9f81cc24f479688d79e49ca875a?format=webp&width=800"
            alt="boAt Logo"
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">
            My boAt
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">My Devices</h2>
            <Badge variant="outline" className="glass-badge text-xs">
              {connectedDevices.length} Connected
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={scanForDevices}
              disabled={earbudState.isScanning}
              className="glass-button border-0"
            >
              <Scan className={`w-5 h-5 ${earbudState.isScanning ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="glass-button border-0">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card glass-surface border-glass-border">
                <DropdownMenuItem onClick={scanForDevices} disabled={earbudState.isScanning}>
                  <Scan className="w-4 h-4 mr-2" />
                  {earbudState.isScanning ? 'Scanning...' : 'Scan for Devices'}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-glass-border" />
                <DropdownMenuItem onClick={clearAllDevices}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Devices
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-glass-border" />
                <DropdownMenuItem>
                  <Info className="w-4 h-4 mr-2" />
                  About
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Available Devices */}
        {availableDevices.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">Available Devices</h3>
            {availableDevices.map((device) => (
              <Card key={device.id} className="p-4 glass-card glass-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bluetooth className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-foreground">{device.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{device.type}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => connectToDevice(device)}
                    className="glass-button border-0"
                    variant="ghost"
                    size="sm"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Connected Devices */}
        {connectedDevices.map((device) => (
          <Card key={device.id} className="p-6 glass-card glass-primary relative glass-shimmer border-primary/40 shadow-glow">
            <div className="relative flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BluetoothConnected className="w-4 h-4 text-primary animate-pulse" />
                  <Badge
                    variant="default"
                    className="text-xs uppercase tracking-wide glass-badge border-0 bg-primary/20 text-primary"
                  >
                    Connected
                  </Badge>
                </div>
                <h3 className="text-xl font-semibold text-foreground">{device.name}</h3>

                {device.leftBattery && device.rightBattery && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">L: {Math.round(device.leftBattery)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">R: {Math.round(device.rightBattery)}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Bluetooth className="w-10 h-10 text-primary" />
                </div>
              </div>
            </div>

            <Button
              onClick={() => disconnectDevice(device)}
              variant="destructive"
              className="w-full mt-4 glass-button border-0 bg-gradient-to-r from-destructive/80 to-destructive/60"
            >
              <Power className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </Card>
        ))}

        {/* No devices message */}
        {availableDevices.length === 0 && connectedDevices.length === 0 && !earbudState.isScanning && (
          <Card className="p-8 glass-card glass-surface text-center">
            <Bluetooth className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Devices Found</h3>
            {earbudState.bluetoothSupported ? (
              <p className="text-muted-foreground mb-6">Scan for nearby Bluetooth devices</p>
            ) : (
              <div className="space-y-3 mb-6">
                <p className="text-muted-foreground">Bluetooth is not supported in this browser</p>
                <p className="text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                  💡 You can still explore the app with a demo device
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
              <Button
                onClick={scanForDevices}
                className="glass-button border-0 w-full"
                variant="ghost"
              >
                <Scan className="w-4 h-4 mr-2" />
                {earbudState.bluetoothSupported ? 'Scan for Devices' : 'Add Demo Device'}
              </Button>
            </div>
          </Card>
        )}

        {/* Scanning indicator */}
        {earbudState.isScanning && (
          <Card className="p-6 glass-card glass-accent text-center">
            <Scan className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-foreground">Scanning for devices...</p>
          </Card>
        )}

        {earbudState.selectedDevice && (
          <>
            {/* Device Status */}
            <Card className="p-4 glass-card glass-surface mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BluetoothConnected className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Audio Engine Status:</span>
                </div>
                <Badge variant={isAudioInitialized ? "default" : "secondary"} className="text-xs">
                  {isAudioInitialized ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Card>

            {/* Control Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Earbud Control */}
              <Card className="p-4 glass-card glass-surface">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Left Earbud</h3>
                    <Switch
                      checked={earbudState.leftEnabled}
                      onCheckedChange={toggleLeft}
                      className="glass-switch"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 glass-progress h-2">
                        <div
                          className="h-full glass-progress-indicator"
                          style={{
                            width: `${Math.round(earbudState.selectedDevice?.leftBattery || 0)}%`,
                            background: `linear-gradient(90deg, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.leftBattery || 0)})), hsl(var(--${getBatteryColor(earbudState.selectedDevice?.leftBattery || 0)})) 50%, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.leftBattery || 0)}) / 0.8))`
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(earbudState.selectedDevice?.leftBattery || 0)}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Right Earbud Control */}
              <Card className="p-4 glass-card glass-surface">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Right Earbud</h3>
                    <Switch
                      checked={earbudState.rightEnabled}
                      onCheckedChange={toggleRight}
                      className="glass-switch"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 glass-progress h-2">
                        <div
                          className="h-full glass-progress-indicator"
                          style={{
                            width: `${Math.round(earbudState.selectedDevice?.rightBattery || 0)}%`,
                            background: `linear-gradient(90deg, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.rightBattery || 0)})), hsl(var(--${getBatteryColor(earbudState.selectedDevice?.rightBattery || 0)})) 50%, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.rightBattery || 0)}) / 0.8))`
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(earbudState.selectedDevice?.rightBattery || 0)}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Audio Balance */}
            <Card className="p-4 glass-card glass-accent">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Audio Balance</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Left</span>
                    <span>Center</span>
                    <span>Right</span>
                  </div>
                  <Slider
                    value={[earbudState.audioBalance]}
                    onValueChange={handleBalanceChange}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full slider-glass"
                  />
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs glass-badge">
                      {earbudState.audioBalance === 0
                        ? "Centered"
                        : earbudState.audioBalance < 0
                          ? `Left ${Math.abs(earbudState.audioBalance)}%`
                          : `Right ${earbudState.audioBalance}%`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Charging Case */}
            <Card className="p-4 glass-card glass-surface">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Charging Case</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 glass-progress h-3">
                    <div
                      className="h-full glass-progress-indicator"
                      style={{
                        width: `${Math.round(earbudState.selectedDevice?.caseBattery || 0)}%`,
                        background: `linear-gradient(90deg, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.caseBattery || 0)})), hsl(var(--${getBatteryColor(earbudState.selectedDevice?.caseBattery || 0)})) 50%, hsl(var(--${getBatteryColor(earbudState.selectedDevice?.caseBattery || 0)}) / 0.8))`
                      }}
                    />
                  </div>
                  <Badge variant="outline" className="text-xs glass-badge">
                    {Math.round(earbudState.selectedDevice?.caseBattery || 0)}%
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Audio Controls */}
            <div className="space-y-3 mt-6">
              <div className="flex gap-3">
                {!isPlayingDemo ? (
                  <Button
                    onClick={startDemoAudio}
                    className="flex-1 h-12 glass-button border-0"
                    variant="ghost"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test Audio
                  </Button>
                ) : (
                  <Button
                    onClick={stopDemoAudio}
                    className="flex-1 h-12 glass-button border-0 bg-destructive/20"
                    variant="ghost"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Stop Audio
                  </Button>
                )}
                <Button
                  onClick={() => setCurrentView('settings')}
                  className="flex-1 h-12 glass-button border-0"
                  variant="ghost"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Equalizer
                </Button>
              </div>

              {isAudioInitialized && (
                <div className="text-center">
                  <Badge variant="outline" className="text-xs glass-badge bg-primary/20 text-primary">
                    Audio Controls Active
                  </Badge>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hidden audio element for demo */}
        <audio
          ref={audioElementRef}
          style={{ display: 'none' }}
          preload="none"
        />

      </div>
    </div>
  );
};

export default EarbudControl;
