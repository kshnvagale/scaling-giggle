export async function isImageDark(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        resolve(false);
        return;
      }
      
      // Scale down for faster processing
      const width = 50;
      const height = (img.height / img.width) * width;
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let brightnessSum = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Using perceived brightness formula
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          brightnessSum += brightness;
        }
        
        const averageBrightness = brightnessSum / (data.length / 4);
        
        // Threshold for dark vs light background
        resolve(averageBrightness < 128);
      } catch (e) {
        // Fallback if canvas is tainted or errors out
        resolve(false);
      }
    };
    
    img.onerror = () => {
      resolve(false);
    };
    
    img.src = imageUrl;
  });
}
