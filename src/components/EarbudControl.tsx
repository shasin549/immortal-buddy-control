import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothConnected, Battery, Volume2, Power, MoreVertical, ArrowLeft, Settings } from "lucide-react";
import earbudsIcon from "@/assets/earbuds-icon.png";

interface EarbudState {
  isConnected: boolean;
  leftEnabled: boolean;
  rightEnabled: boolean;
  leftBattery: number;
  rightBattery: number;
  caseBattery: number;
  audioBalance: number;
}

interface EqualizerState {
  sliders: number[]; // 10 band equalizer
  preset: 'manual' | 'brilliant-treble' | 'bass-boost' | 'vocal-boost';
  surroundVirtualiser: boolean;
  volumeLeveller: boolean;
}

const EarbudControl = () => {
  const [currentView, setCurrentView] = useState<'devices' | 'settings'>('devices');
  const [earbudState, setEarbudState] = useState<EarbudState>({
    isConnected: false,
    leftEnabled: true,
    rightEnabled: true,
    leftBattery: 85,
    rightBattery: 92,
    caseBattery: 67,
    audioBalance: 0,
  });

  const [equalizerState, setEqualizerState] = useState<EqualizerState>({
    sliders: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], // 10 bands at 50% (center)
    preset: 'manual',
    surroundVirtualiser: true,
    volumeLeveller: true,
  });

  const getBatteryColor = (level: number) => {
    if (level > 60) return "battery-high";
    if (level > 30) return "battery-medium";
    if (level > 15) return "battery-low";
    return "battery-critical";
  };

  const toggleConnection = () => {
    setEarbudState(prev => ({
      ...prev,
      isConnected: !prev.isConnected
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
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

        <div className="p-6 space-y-8">
          {/* Equalizer */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bass</span>
              <span className="text-sm text-muted-foreground">Treble</span>
            </div>
            
            <div className="flex justify-between items-end h-64 px-4">
              {equalizerState.sliders.map((value, index) => (
                <div key={index} className="flex flex-col items-center h-full">
                  <div className="flex-1 flex items-end pb-2">
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => handleEqualizerChange(index, newValue)}
                      min={0}
                      max={100}
                      step={1}
                      orientation="vertical"
                      className="h-48 w-3"
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
                  className="w-full justify-start h-12 text-left"
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
            
            <Card className="p-4 bg-card border-border">
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
                />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
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
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="text-center p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">
          Manage Devices
        </h1>
        <p className="text-lg text-foreground">
          Effortlessly<span className="text-primary">.</span>
        </p>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">My Devices</h2>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Device Card - boAt Immortal 161 */}
        <Card className="p-6 bg-card border border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {earbudState.isConnected ? (
                  <BluetoothConnected className="w-4 h-4 text-primary" />
                ) : (
                  <Bluetooth className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge 
                  variant={earbudState.isConnected ? "default" : "secondary"}
                  className="text-xs uppercase tracking-wide"
                >
                  {earbudState.isConnected ? "Connected" : "Available"}
                </Badge>
              </div>
              <h3 className="text-xl font-semibold text-foreground">boAt Immortal 161</h3>
              
              {earbudState.isConnected && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">L: {earbudState.leftBattery}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">R: {earbudState.rightBattery}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <img src={earbudsIcon} alt="boAt Immortal 161" className="w-20 h-20" />
            </div>
          </div>
          
          {!earbudState.isConnected && (
            <Button 
              onClick={toggleConnection}
              className="w-full mt-4"
              variant="default"
            >
              <Power className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </Card>

        {earbudState.isConnected && (
          <>
            {/* Control Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Earbud Control */}
              <Card className="p-4 bg-card border-border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Left Earbud</h3>
                    <Switch
                      checked={earbudState.leftEnabled}
                      onCheckedChange={toggleLeft}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${earbudState.leftBattery}%`,
                            backgroundColor: `hsl(var(--${getBatteryColor(earbudState.leftBattery)}))`
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{earbudState.leftBattery}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Right Earbud Control */}
              <Card className="p-4 bg-card border-border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Right Earbud</h3>
                    <Switch
                      checked={earbudState.rightEnabled}
                      onCheckedChange={toggleRight}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${earbudState.rightBattery}%`,
                            backgroundColor: `hsl(var(--${getBatteryColor(earbudState.rightBattery)}))`
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{earbudState.rightBattery}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Audio Balance */}
            <Card className="p-4 bg-card border-border">
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
                    className="w-full"
                  />
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
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
            <Card className="p-4 bg-card border-border">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Charging Case</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-secondary rounded-full h-3">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${earbudState.caseBattery}%`,
                        backgroundColor: `hsl(var(--${getBatteryColor(earbudState.caseBattery)}))`
                      }}
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {earbudState.caseBattery}%
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Audio Settings Button */}
            <Button 
              onClick={() => setCurrentView('settings')}
              className="w-full mt-6 h-12"
              variant="default"
            >
              <Settings className="w-4 h-4 mr-2" />
              Custom Audio Settings
            </Button>

            {/* Disconnect Button */}
            <Button 
              onClick={toggleConnection}
              variant="destructive"
              className="w-full mt-2"
            >
              Disconnect Device
            </Button>
          </>
        )}

        {/* Add Device Button */}
        {!earbudState.isConnected && (
          <Button variant="destructive" className="w-full mt-6 h-12">
            Add a Device +
          </Button>
        )}
      </div>
    </div>
  );
};

export default EarbudControl;