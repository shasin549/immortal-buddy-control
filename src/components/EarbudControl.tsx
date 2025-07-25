import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
}

interface EqualizerState {
  sliders: number[]; // 10 band equalizer
  preset: 'manual' | 'brilliant-treble' | 'bass-boost' | 'vocal-boost';
  surroundVirtualiser: boolean;
  volumeLeveller: boolean;
}

const EarbudControl = () => {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'devices' | 'settings'>('devices');
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([]);
  const [earbudState, setEarbudState] = useState<EarbudState>({
    selectedDevice: null,
    leftEnabled: true,
    rightEnabled: true,
    audioBalance: 0,
    isScanning: false,
  });

  const [equalizerState, setEqualizerState] = useState<EqualizerState>({
    sliders: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], // 10 bands at 50% (center)
    preset: 'manual',
    surroundVirtualiser: true,
    volumeLeveller: true,
  });

  // Real-time device scanning with fallback demo devices
  const scanForDevices = async () => {
    setEarbudState(prev => ({ ...prev, isScanning: true }));

    try {
      // Check if Bluetooth is supported
      if (navigator.bluetooth) {
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

        } catch (bluetoothError) {
          console.log('Bluetooth access denied or cancelled:', bluetoothError);
          toast({
            title: "Bluetooth Access Denied",
            description: "Showing demo devices instead. Grant permission to scan real devices.",
          });
          addDemoDevices();
        }
      } else {
        toast({
          title: "Bluetooth Not Supported",
          description: "Your browser doesn't support Bluetooth. Showing demo devices.",
        });
        addDemoDevices();
      }

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "Scan Failed",
        description: "Unable to scan for devices. Showing demo devices.",
        variant: "destructive",
      });
      addDemoDevices();
    } finally {
      // Add delay to show scanning animation
      setTimeout(() => {
        setEarbudState(prev => ({ ...prev, isScanning: false }));
      }, 1500);
    }
  };

  // Add demo devices for testing
  const addDemoDevices = () => {
    const demoDevices: BluetoothDevice[] = [
      {
        id: 'demo_airpods',
        name: 'AirPods Pro',
        type: 'earbuds',
        isConnected: false,
        isPaired: true,
        rssi: -45
      },
      {
        id: 'demo_boat',
        name: 'boAt Immortal 161',
        type: 'earbuds',
        isConnected: false,
        isPaired: true,
        rssi: -38
      },
      {
        id: 'demo_sony',
        name: 'Sony WH-1000XM4',
        type: 'headphones',
        isConnected: false,
        isPaired: true,
        rssi: -52
      }
    ];

    const newDevices = demoDevices.filter(
      demo => !availableDevices.find(existing => existing.id === demo.id) &&
              !connectedDevices.find(existing => existing.id === demo.id)
    );

    if (newDevices.length > 0) {
      setAvailableDevices(prev => [...prev, ...newDevices]);
      toast({
        title: "Demo Devices Added",
        description: `Added ${newDevices.length} demo devices for testing.`,
      });
    } else {
      toast({
        title: "Demo Devices",
        description: "Demo devices are already available.",
      });
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

      // In real implementation, this would connect to the actual device
      await new Promise(resolve => setTimeout(resolve, 1500));

      const connectedDevice: BluetoothDevice = {
        ...device,
        isConnected: true,
        leftBattery: Math.floor(Math.random() * 40) + 60, // Real-time battery would come from device
        rightBattery: Math.floor(Math.random() * 40) + 60,
        caseBattery: Math.floor(Math.random() * 40) + 50,
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

    } catch (error) {
      console.error('Failed to connect:', error);
      setEarbudState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const disconnectDevice = (device: BluetoothDevice) => {
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
  };

  const startBatteryMonitoring = (deviceId: string) => {
    // Simulate real-time battery updates
    const interval = setInterval(() => {
      setConnectedDevices(prev => prev.map(device => {
        if (device.id === deviceId) {
          return {
            ...device,
            leftBattery: Math.max(0, (device.leftBattery || 80) - Math.random() * 2),
            rightBattery: Math.max(0, (device.rightBattery || 80) - Math.random() * 2),
            caseBattery: Math.max(0, (device.caseBattery || 70) - Math.random() * 1),
          };
        }
        return device;
      }));
    }, 30000); // Update every 30 seconds

    // Clean up interval when component unmounts or device disconnects
    return () => clearInterval(interval);
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
    setEarbudState(prev => ({
      ...prev,
      leftEnabled: !prev.leftEnabled
    }));
  };

  const toggleRight = () => {
    setEarbudState(prev => ({
      ...prev,
      rightEnabled: !prev.rightEnabled
    }));
  };

  const handleBalanceChange = (value: number[]) => {
    setEarbudState(prev => ({
      ...prev,
      audioBalance: value[0]
    }));
  };

  const handleEqualizerChange = (index: number, value: number[]) => {
    const newSliders = [...equalizerState.sliders];
    newSliders[index] = value[0];
    setEqualizerState(prev => ({
      ...prev,
      sliders: newSliders,
      preset: 'manual'
    }));
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
    
    setEqualizerState(prev => ({
      ...prev,
      sliders: newSliders,
      preset
    }));
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
          {/* Equalizer */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <span className="text-sm text-muted-foreground font-medium">Bass</span>
              <span className="text-sm text-muted-foreground font-medium">Treble</span>
            </div>

            <div className="flex justify-between items-end h-64 px-6 py-6 glass-card glass-surface rounded-xl glass-shimmer">
              {equalizerState.sliders.map((value, index) => (
                <div key={index} className="flex flex-col items-center h-full">
                  <div className="flex-1 flex items-end pb-4">
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => handleEqualizerChange(index, newValue)}
                      min={0}
                      max={100}
                      step={1}
                      orientation="vertical"
                      className="h-44 w-4 slider-glass"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equalizer Presets */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Choose equaliser</h3>
            <div className="space-y-3">
              {[
                { id: 'manual', label: 'Manual' },
                { id: 'brilliant-treble', label: 'Brilliant treble' },
                { id: 'bass-boost', label: 'Bass boost' },
                { id: 'vocal-boost', label: 'Vocal boost' }
              ].map((preset) => (
                <Button
                  key={preset.id}
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left transition-all duration-300 hover:glass-card ${
                    equalizerState.preset === preset.id
                      ? 'glass-card glass-primary border border-primary/30'
                      : 'hover:bg-glass-bg hover:backdrop-blur-sm'
                  }`}
                  onClick={() => applyPreset(preset.id as EqualizerState['preset'])}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      equalizerState.preset === preset.id 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {equalizerState.preset === preset.id && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span className="text-foreground">{preset.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Profile Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Profile settings</h3>
            
            <Card className="p-4 glass-card glass-surface">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Surround Virtualiser</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a surround sound experience through your connected device
                  </p>
                </div>
                <Switch
                  checked={equalizerState.surroundVirtualiser}
                  onCheckedChange={(checked) =>
                    setEqualizerState(prev => ({ ...prev, surroundVirtualiser: checked }))
                  }
                  className="glass-switch"
                />
              </div>
            </Card>

            <Card className="p-4 glass-card glass-surface">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Volume leveller</h4>
                  <p className="text-sm text-muted-foreground">
                    Hear the same volume level for each audio source
                  </p>
                </div>
                <Switch
                  checked={equalizerState.volumeLeveller}
                  onCheckedChange={(checked) =>
                    setEqualizerState(prev => ({ ...prev, volumeLeveller: checked }))
                  }
                  className="glass-switch"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background glass-bg-animated">
      {/* Header */}
      <div className="text-center p-6 space-y-4 glass-surface backdrop-blur-sm border-b border-glass-border glass-shimmer">
        <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">
          Manage Devices
        </h1>
        <p className="text-lg text-foreground/90">
          Effortlessly<span className="text-primary drop-shadow-sm">.</span>
        </p>
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
                <DropdownMenuItem onClick={addDemoDevices}>
                  <Power className="w-4 h-4 mr-2" />
                  Add Demo Devices
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
            <p className="text-muted-foreground mb-6">Scan for nearby Bluetooth devices or try demo devices</p>
            <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
              <Button
                onClick={scanForDevices}
                className="glass-button border-0 w-full"
                variant="ghost"
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan for Real Devices
              </Button>
              <Button
                onClick={addDemoDevices}
                className="glass-button border-0 w-full"
                variant="ghost"
              >
                <Power className="w-4 h-4 mr-2" />
                Try Demo Devices
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

            {/* Audio Settings Button */}
            <Button
              onClick={() => setCurrentView('settings')}
              className="w-full mt-6 h-12 glass-button border-0"
              variant="ghost"
            >
              <Settings className="w-4 h-4 mr-2" />
              Custom Audio Settings
            </Button>
          </>
        )}


      </div>
    </div>
  );
};

export default EarbudControl;
