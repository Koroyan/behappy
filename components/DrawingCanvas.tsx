import React, { useState } from 'react';
import { Alert, Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

// Platform-specific imports
let Canvas: any, Path: any, Skia: any, useCanvasRef: any, SkPath: any;
let Gesture: any, GestureDetector: any;

// Only import Skia on native platforms
if (Platform.OS !== 'web') {
  try {
    const SkiaModule = require('@shopify/react-native-skia');
    Canvas = SkiaModule.Canvas;
    Path = SkiaModule.Path;
    Skia = SkiaModule.Skia;
    useCanvasRef = SkiaModule.useCanvasRef;
    SkPath = SkiaModule.SkPath;
    
    const GestureModule = require('react-native-gesture-handler');
    Gesture = GestureModule.Gesture;
    GestureDetector = GestureModule.GestureDetector;
  } catch (error) {
    console.warn('Skia or Gesture Handler not available:', error);
  }
}

interface DrawingCanvasProps {
  onSave?: (drawing: string) => void;
  onComplete?: () => void;
  prompt?: string;
}

interface DrawingPath {
  path: any; // SkPath type
  color: string;
  strokeWidth: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onSave,
  onComplete,
  prompt = "Draw your feelings or whatever comes to mind...",
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<any | null>(null); // SkPath type
  const [currentColor, setCurrentColor] = useState(TherapyColors.interactive.drawing);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  // Platform check for canvas support
  if (Platform.OS === 'web') {
    return (
      <View style={therapyStyles.canvasContainer}>
        <Text style={therapyStyles.subtitle}>Art Therapy Canvas</Text>
        <View style={{
          height: 400,
          backgroundColor: '#F8F9FA',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: TherapyColors.primary,
          marginVertical: 16,
        }}>
          <Text style={[therapyStyles.body, { textAlign: 'center', color: TherapyColors.textSecondary }]}>
            🎨 Art Therapy Canvas{'\n'}
            (Available on mobile devices){'\n\n'}
            Drawing with touch and gestures helps express emotions{'\n'}
            that are difficult to put into words.
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => onComplete?.()}
          style={therapyStyles.primaryButton}
        >
          <Text style={therapyStyles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canvasRef = useCanvasRef();
  const { width } = Dimensions.get('window');
  const canvasHeight = 300;

  const availableColors = [
    TherapyColors.interactive.drawing, // Red
    TherapyColors.primary, // Blue
    TherapyColors.healing, // Green
    TherapyColors.support, // Orange
    TherapyColors.emotions.joy, // Yellow
    TherapyColors.emotions.love, // Pink
    TherapyColors.emotions.calm, // Cyan
    TherapyColors.emotions.fear, // Purple
    '#000000', // Black
    '#8B4513', // Brown
  ];

  const strokeWidths = [2, 4, 8, 12];

  const gesture = Gesture.Pan()
    .onStart((event: any) => {
      const newPath = Skia.Path.Make();
      newPath.moveTo(event.x, event.y);
      setCurrentPath(newPath);
      setIsDrawing(true);
    })
    .onUpdate((event: any) => {
      if (currentPath) {
        currentPath.lineTo(event.x, event.y);
        setCurrentPath(currentPath.copy());
      }
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths(prev => [...prev, {
          path: currentPath,
          color: currentColor,
          strokeWidth: strokeWidth,
        }]);
        setCurrentPath(null);
      }
      setIsDrawing(false);
    });

  const clearCanvas = () => {
    Alert.alert(
      'Clear Drawing',
      'Are you sure you want to clear your drawing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            setCurrentPath(null);
          },
        },
      ]
    );
  };

  const undoLastStroke = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const saveDrawing = async () => {
    try {
      // In a real implementation, you would capture the canvas as an image
      // and pass it to the onSave callback
      const drawingData = JSON.stringify({
        paths: paths.length,
        timestamp: new Date().toISOString(),
        colors: [...new Set(paths.map(p => p.color))],
      });
      
      onSave?.(drawingData);
      
      Alert.alert(
        'Drawing Saved',
        'Your drawing has been saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => onComplete?.(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save drawing. Please try again.');
    }
  };

  return (
    <View style={therapyStyles.interactiveContainer}>
      <View style={therapyStyles.canvasHeader}>
        <Text style={therapyStyles.canvasHeaderText}>Art Therapy Canvas</Text>
        <TouchableOpacity
          onPress={saveDrawing}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text style={[therapyStyles.canvasHeaderText, { fontSize: 14 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <Text style={[therapyStyles.body, { textAlign: 'center', margin: 16 }]}>
        {prompt}
      </Text>

      <View style={therapyStyles.canvasContainer}>
        <GestureDetector gesture={gesture}>
          <Canvas
            ref={canvasRef}
            style={{
              width: width - 32,
              height: canvasHeight,
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Render completed paths */}
            {paths.map((pathData, index) => (
              <Path
                key={index}
                path={pathData.path}
                color={pathData.color}
                style="stroke"
                strokeWidth={pathData.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
            
            {/* Render current path being drawn */}
            {currentPath && (
              <Path
                path={currentPath}
                color={currentColor}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            )}
          </Canvas>
        </GestureDetector>

        <View style={therapyStyles.canvasControls}>
          {/* Color picker */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[therapyStyles.caption, { marginRight: 8 }]}>Colors:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {availableColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setCurrentColor(color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: color,
                    marginRight: 6,
                    marginBottom: 4,
                    borderWidth: currentColor === color ? 3 : 1,
                    borderColor: currentColor === color ? TherapyColors.primary : '#DDD',
                  }}
                />
              ))}
            </View>
          </View>

          {/* Stroke width picker */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[therapyStyles.caption, { marginRight: 8 }]}>Brush:</Text>
            {strokeWidths.map((width) => (
              <TouchableOpacity
                key={width}
                onPress={() => setStrokeWidth(width)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: strokeWidth === width ? TherapyColors.primaryLight : '#F0F0F0',
                  marginRight: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: strokeWidth === width ? TherapyColors.primary : '#DDD',
                }}
              >
                <View
                  style={{
                    width: width + 2,
                    height: width + 2,
                    borderRadius: (width + 2) / 2,
                    backgroundColor: currentColor,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
            <TouchableOpacity
              onPress={undoLastStroke}
              disabled={paths.length === 0}
              style={[
                therapyStyles.secondaryButton,
                {
                  flex: 1,
                  marginHorizontal: 4,
                  paddingVertical: 8,
                  opacity: paths.length === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[therapyStyles.secondaryButtonText, { fontSize: 14 }]}>
                Undo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearCanvas}
              disabled={paths.length === 0 && !currentPath}
              style={[
                therapyStyles.secondaryButton,
                {
                  flex: 1,
                  marginHorizontal: 4,
                  paddingVertical: 8,
                  opacity: paths.length === 0 && !currentPath ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[therapyStyles.secondaryButtonText, { fontSize: 14 }]}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={saveDrawing}
              disabled={paths.length === 0}
              style={[
                therapyStyles.primaryButton,
                {
                  flex: 1,
                  marginHorizontal: 4,
                  paddingVertical: 8,
                  opacity: paths.length === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[therapyStyles.primaryButtonText, { fontSize: 14 }]}>
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={[therapyStyles.bodySecondary, { textAlign: 'center', marginTop: 12 }]}>
        Express yourself freely. There's no right or wrong way to draw your emotions.
      </Text>
    </View>
  );
};

export default DrawingCanvas;