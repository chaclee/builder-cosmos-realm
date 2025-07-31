import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Copy, Palette, Pipette, Eye, Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ColorState {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  hsv: { h: number; s: number; v: number };
}

export default function Index() {
  const [currentColor, setCurrentColor] = useState<ColorState>({
    hex: "#3b82f6",
    rgb: { r: 59, g: 130, b: 246 },
    hsl: { h: 217, s: 91, l: 60 },
    hsv: { h: 217, s: 76, v: 96 },
  });

  const [colorHistory, setColorHistory] = useState<string[]>([
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueSatRef = useRef<HTMLCanvasElement>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);

  // Convert functions
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  const updateColor = useCallback(
    (newRgb: { r: number; g: number; b: number }) => {
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      const hsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
      const hsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);

      setCurrentColor({
        hex,
        rgb: newRgb,
        hsl,
        hsv,
      });
    },
    [],
  );

  const drawColorPicker = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgb(255, 0, 0)");
    gradient.addColorStop(1 / 6, "rgb(255, 255, 0)");
    gradient.addColorStop(2 / 6, "rgb(0, 255, 0)");
    gradient.addColorStop(3 / 6, "rgb(0, 255, 255)");
    gradient.addColorStop(4 / 6, "rgb(0, 0, 255)");
    gradient.addColorStop(5 / 6, "rgb(255, 0, 255)");
    gradient.addColorStop(1, "rgb(255, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add white to black gradient
    const gradient2 = ctx.createLinearGradient(0, 0, 0, height);
    gradient2.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient2.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    gradient2.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    gradient2.addColorStop(1, "rgba(0, 0, 0, 1)");

    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, width, height);
  }, []);

  useEffect(() => {
    drawColorPicker();
  }, [drawColorPicker]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    updateColor({ r, g, b });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: `${label} 值已复制到剪贴板: ${text}`,
    });
  };

  const addToHistory = (color: string) => {
    setColorHistory((prev) => {
      const newHistory = [color, ...prev.filter((c) => c !== color)];
      return newHistory.slice(0, 10);
    });
  };

  const handleHexChange = (value: string) => {
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const rgb = hexToRgb(value);
      updateColor(rgb);
      addToHistory(value);
    }
  };

  const startEyeDropper = async () => {
    if ("EyeDropper" in window) {
      try {
        setIsPickingColor(true);
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        const rgb = hexToRgb(result.sRGBHex);
        updateColor(rgb);
        addToHistory(result.sRGBHex);
      } catch (e) {
        console.log("用户取消了颜色选择");
      } finally {
        setIsPickingColor(false);
      }
    } else {
      toast({
        title: "不支持",
        description: "您的浏览器不支持系统取色器功能",
        variant: "destructive",
      });
    }
  };

  const generateRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    updateColor({ r, g, b });
    addToHistory(rgbToHex(r, g, b));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Palette className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              系统级取色器
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            专业的颜色选择工具，支持多种颜色格式，提供系统级取色功能
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Color Display */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: currentColor.hex }}
                  />
                  当前颜色
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Large color preview */}
                <div
                  className="w-full h-32 rounded-lg border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-105"
                  style={{ backgroundColor: currentColor.hex }}
                  onClick={() => copyToClipboard(currentColor.hex, "HEX")}
                />

                {/* System Eye Dropper */}
                <div className="space-y-2">
                  <Button
                    onClick={startEyeDropper}
                    disabled={isPickingColor}
                    className="w-full"
                    variant="outline"
                  >
                    <Pipette className="w-4 h-4 mr-2" />
                    {isPickingColor ? "选择颜色中..." : "系统取色器"}
                  </Button>
                  <Button
                    onClick={generateRandomColor}
                    className="w-full"
                    variant="outline"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    随机颜色
                  </Button>
                </div>

                {/* Color values */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">HEX</Label>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() => copyToClipboard(currentColor.hex, "HEX")}
                    >
                      {currentColor.hex} <Copy className="w-3 h-3 ml-1" />
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">RGB</Label>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() =>
                        copyToClipboard(
                          `rgb(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b})`,
                          "RGB",
                        )
                      }
                    >
                      {currentColor.rgb.r}, {currentColor.rgb.g},{" "}
                      {currentColor.rgb.b} <Copy className="w-3 h-3 ml-1" />
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">HSL</Label>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() =>
                        copyToClipboard(
                          `hsl(${currentColor.hsl.h}, ${currentColor.hsl.s}%, ${currentColor.hsl.l}%)`,
                          "HSL",
                        )
                      }
                    >
                      {currentColor.hsl.h}°, {currentColor.hsl.s}%,{" "}
                      {currentColor.hsl.l}% <Copy className="w-3 h-3 ml-1" />
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">HSV</Label>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() =>
                        copyToClipboard(
                          `hsv(${currentColor.hsv.h}, ${currentColor.hsv.s}%, ${currentColor.hsv.v}%)`,
                          "HSV",
                        )
                      }
                    >
                      {currentColor.hsv.h}°, {currentColor.hsv.s}%,{" "}
                      {currentColor.hsv.v}% <Copy className="w-3 h-3 ml-1" />
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color History */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">颜色历史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {colorHistory.map((color, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded cursor-pointer border-2 border-white shadow hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        const rgb = hexToRgb(color);
                        updateColor(rgb);
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Color Picker Tools */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="picker" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="picker">颜色选择器</TabsTrigger>
                <TabsTrigger value="sliders">滑块调节</TabsTrigger>
                <TabsTrigger value="input">输入模式</TabsTrigger>
              </TabsList>

              <TabsContent value="picker" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>颜色选择器</CardTitle>
                    <CardDescription>点击色谱选择颜色</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={300}
                      className="w-full h-64 border rounded-lg cursor-crosshair"
                      onClick={handleCanvasClick}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sliders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>RGB 滑块</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>红色 (R): {currentColor.rgb.r}</Label>
                      <Slider
                        value={[currentColor.rgb.r]}
                        onValueChange={([r]) =>
                          updateColor({ ...currentColor.rgb, r })
                        }
                        max={255}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>绿色 (G): {currentColor.rgb.g}</Label>
                      <Slider
                        value={[currentColor.rgb.g]}
                        onValueChange={([g]) =>
                          updateColor({ ...currentColor.rgb, g })
                        }
                        max={255}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>蓝色 (B): {currentColor.rgb.b}</Label>
                      <Slider
                        value={[currentColor.rgb.b]}
                        onValueChange={([b]) =>
                          updateColor({ ...currentColor.rgb, b })
                        }
                        max={255}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>HSL 滑块</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>色相 (H): {currentColor.hsl.h}°</Label>
                      <Slider
                        value={[currentColor.hsl.h]}
                        onValueChange={([h]) => {
                          const rgb = hslToRgb(
                            h,
                            currentColor.hsl.s,
                            currentColor.hsl.l,
                          );
                          updateColor(rgb);
                        }}
                        max={360}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>饱和度 (S): {currentColor.hsl.s}%</Label>
                      <Slider
                        value={[currentColor.hsl.s]}
                        onValueChange={([s]) => {
                          const rgb = hslToRgb(
                            currentColor.hsl.h,
                            s,
                            currentColor.hsl.l,
                          );
                          updateColor(rgb);
                        }}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>亮度 (L): {currentColor.hsl.l}%</Label>
                      <Slider
                        value={[currentColor.hsl.l]}
                        onValueChange={([l]) => {
                          const rgb = hslToRgb(
                            currentColor.hsl.h,
                            currentColor.hsl.s,
                            l,
                          );
                          updateColor(rgb);
                        }}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="input" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>直接输入</CardTitle>
                    <CardDescription>输入具体的颜色值</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hex-input">HEX 颜色值</Label>
                      <Input
                        id="hex-input"
                        value={currentColor.hex}
                        onChange={(e) => handleHexChange(e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="r-input">红色 (R)</Label>
                        <Input
                          id="r-input"
                          type="number"
                          min="0"
                          max="255"
                          value={currentColor.rgb.r}
                          onChange={(e) => {
                            const r = parseInt(e.target.value) || 0;
                            updateColor({
                              ...currentColor.rgb,
                              r: Math.max(0, Math.min(255, r)),
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="g-input">绿色 (G)</Label>
                        <Input
                          id="g-input"
                          type="number"
                          min="0"
                          max="255"
                          value={currentColor.rgb.g}
                          onChange={(e) => {
                            const g = parseInt(e.target.value) || 0;
                            updateColor({
                              ...currentColor.rgb,
                              g: Math.max(0, Math.min(255, g)),
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="b-input">蓝色 (B)</Label>
                        <Input
                          id="b-input"
                          type="number"
                          min="0"
                          max="255"
                          value={currentColor.rgb.b}
                          onChange={(e) => {
                            const b = parseInt(e.target.value) || 0;
                            updateColor({
                              ...currentColor.rgb,
                              b: Math.max(0, Math.min(255, b)),
                            });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
