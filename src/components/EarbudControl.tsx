import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothConnected, Battery, Volume2, Power } from "lucide-react";
import earbudsIcon from "@/assets/earbuds-icon.png";

interface EarbudState {
  isConnected: boolean;
  leftEnabled: boolean;
  rightEnabled: boolean;
  leftBattery: number;
  rightBattery: number;
  caseBattery: number;
  audioBalance: number; // -100 (left) to 100 (right), 0 is center
}

const EarbudControl = () => {
  const [earbudState, setEarbudState] = useState<EarbudState>({
    isConnected: false,
    leftEnabled: true,
    rightEnabled: true,
    leftBattery: 85,
    rightBattery: 92,
    caseBattery: 67,
    audioBalance: 0,
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

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <img src={earbudsIcon} alt="Earbuds" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-foreground">boAt Immortal 161</h1>
        </div>
        <div className="flex items-center justify-center gap-2">
          {earbudState.isConnected ? (
            <BluetoothConnected className="w-5 h-5 text-bluetooth" />
          ) : (
            <Bluetooth className="w-5 h-5 text-muted-foreground" />
          )}
          <Badge variant={earbudState.isConnected ? "default" : "secondary"}>
            {earbudState.isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Connection Control */}
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Bluetooth Connection</h3>
            <p className="text-sm text-muted-foreground">
              {earbudState.isConnected ? "Device connected and ready" : "Tap to connect"}
            </p>
          </div>
          <Button
            onClick={toggleConnection}
            variant={earbudState.isConnected ? "default" : "outline"}
            className="h-12 px-6"
          >
            <Power className="w-4 h-4 mr-2" />
            {earbudState.isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </Card>

      {earbudState.isConnected && (
        <>
          {/* Earbud Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Earbud */}
            <Card className="p-6 bg-gradient-card border-border shadow-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Left Earbud</h3>
                  <Switch
                    checked={earbudState.leftEnabled}
                    onCheckedChange={toggleLeft}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Battery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-300`}
                        style={{
                          width: `${earbudState.leftBattery}%`,
                          backgroundColor: `hsl(var(--${getBatteryColor(earbudState.leftBattery)}))`
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {earbudState.leftBattery}%
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Earbud */}
            <Card className="p-6 bg-gradient-card border-border shadow-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Right Earbud</h3>
                  <Switch
                    checked={earbudState.rightEnabled}
                    onCheckedChange={toggleRight}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Battery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-300`}
                        style={{
                          width: `${earbudState.rightBattery}%`,
                          backgroundColor: `hsl(var(--${getBatteryColor(earbudState.rightBattery)}))`
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {earbudState.rightBattery}%
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Audio Balance Control */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Audio Balance</h3>
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
                  <Badge variant="outline">
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
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Battery className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Charging Case</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-secondary rounded-full h-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-300`}
                    style={{
                      width: `${earbudState.caseBattery}%`,
                      backgroundColor: `hsl(var(--${getBatteryColor(earbudState.caseBattery)}))`
                    }}
                  />
                </div>
                <Badge variant="outline">
                  {earbudState.caseBattery}%
                </Badge>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Development Note */}
      <Card className="p-4 bg-muted/50 border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          <strong>Development Mode:</strong> This interface uses mock data. Integrate with Capacitor plugins for real Bluetooth functionality.
        </p>
      </Card>
    </div>
  );
};

export default EarbudControl;