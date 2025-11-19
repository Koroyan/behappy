import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Platform-specific imports
let Canvas: any, Path: any, Skia: any, useCanvasRef: any;
let Gesture: any, GestureDetector: any;

// Only import Skia on native platforms
if (Platform.OS !== 'web') {
  try {
    const SkiaModule = require('@shopify/react-native-skia');
    Canvas = SkiaModule.Canvas;
    Path = SkiaModule.Path;
    Skia = SkiaModule.Skia;
    useCanvasRef = SkiaModule.useCanvasRef;
    
    const GestureModule = require('react-native-gesture-handler');
    Gesture = GestureModule.Gesture;
    GestureDetector = GestureModule.GestureDetector;
  } catch (error) {
    console.warn('Skia or Gesture Handler not available:', error);
  }
}

interface ArtTherapyCanvasProps {
  onClose: () => void;
  onSave: (uri: string) => void;
  prompt?: string;
}

interface DrawingPath {
  path: any;
  color: string;
  strokeWidth: number;
}

const ArtTherapyCanvas: React.FC<ArtTherapyCanvasProps> = ({
  onClose,
  onSave,
  prompt
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<any | null>(null);
  const [currentColor, setCurrentColor] = useState('#E74C3C');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const canvasRef = React.useRef<View>(null);

  const { width, height } = Dimensions.get('window');
  const canvasHeight = height - 250;

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Art Therapy Canvas</Text>
        </View>

        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            🎨 Drawing Canvas{'\n'}
            Available on mobile devices
          </Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = [
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
    '#9B59B6', '#1ABC9C', '#E91E63', '#FF5722',
    '#000000', '#8B4513', '#95A5A6', '#FFFFFF'
  ];

  const strokeWidths = [2, 4, 8, 12];

  const gesture = Gesture.Pan()
    .onStart((event: any) => {
      const newPath = Skia.Path.Make();
      newPath.moveTo(event.x, event.y);
      setCurrentPath(newPath);
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
    });

  const handleClear = () => {
    Alert.alert(
      'Clear Drawing',
      'Are you sure you want to clear everything?',
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

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleSave = async () => {
    if (paths.length === 0) {
      Alert.alert('Empty Canvas', 'Please draw something before saving.');
      return;
    }

    try {
      // Capture canvas as image
      if (canvasRef.current) {
        const uri = await captureRef(canvasRef, {
          format: 'jpg',
          quality: 0.9
        });
        onSave(uri);
      } else {
        // Fallback: just trigger save with a placeholder
        onSave('drawing_' + Date.now());
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save drawing');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Art Therapy Canvas</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Prompt */}
      {prompt && (
        <View style={styles.promptContainer}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>
      )}

      {/* Canvas */}
      <View ref={canvasRef} collapsable={false}>
        <GestureDetector gesture={gesture}>
          <Canvas
            style={{
              width: width,
              height: canvasHeight,
              backgroundColor: '#FFFFFF',
            }}
          >
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
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Color Picker */}
        <View style={styles.colorPicker}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setCurrentColor(color)}
              style={[
                styles.colorButton,
                {
                  backgroundColor: color,
                  borderWidth: currentColor === color ? 3 : 1,
                  borderColor: currentColor === color ? '#6366F1' : '#DDD',
                }
              ]}
            />
          ))}
        </View>

        {/* Brush Size */}
        <View style={styles.brushPicker}>
          {strokeWidths.map((width) => (
            <TouchableOpacity
              key={width}
              onPress={() => setStrokeWidth(width)}
              style={[
                styles.brushButton,
                strokeWidth === width && styles.brushButtonActive
              ]}
            >
              <View
                style={[
                  styles.brushPreview,
                  {
                    width: width + 4,
                    height: width + 4,
                    borderRadius: (width + 4) / 2,
                    backgroundColor: currentColor,
                  }
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={paths.length === 0}
            style={[styles.actionButton, paths.length === 0 && styles.actionButtonDisabled]}
          >
            <Text style={styles.actionButtonText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClear}
            disabled={paths.length === 0}
            style={[styles.actionButton, paths.length === 0 && styles.actionButtonDisabled]}
          >
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={paths.length === 0}
            style={[styles.completeButton, paths.length === 0 && styles.actionButtonDisabled]}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 20,
    color: '#1F2937'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 20
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  promptContainer: {
    padding: 16,
    backgroundColor: '#EEF2FF'
  },
  promptText: {
    fontSize: 14,
    color: '#4F46E5',
    textAlign: 'center',
    lineHeight: 20
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  webFallbackText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24
  },
  controls: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  brushPicker: {
    flexDirection: 'row',
    marginBottom: 12
  },
  brushButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  brushButtonActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1'
  },
  brushPreview: {
    // Dynamic styles applied inline
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    alignItems: 'center'
  },
  actionButtonDisabled: {
    opacity: 0.5
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    marginHorizontal: 4,
    alignItems: 'center'
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  continueButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center'
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default ArtTherapyCanvas;
