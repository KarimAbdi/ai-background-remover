
import React, { useState, useCallback, useMemo, ChangeEvent } from 'react';
import { ImageFile, BackgroundOption, BackgroundType } from './types';
import { fileToImageFile, urlToImageFile } from './utils/helpers';
import { removeBackground, cartoonifyImage, combineImageAndBackground, combineImageAndColor } from './services/geminiService';
import { UploadIcon, SparkleIcon, DownloadIcon, ResetIcon } from './components/icons';

const PRESET_BACKGROUNDS = [
    "https://picsum.photos/id/1018/1024/768", // Forest
    "https://picsum.photos/id/1015/1024/768", // River
    "https://picsum.photos/id/1043/1024/768", // City Street
    "https://picsum.photos/id/129/1024/768", // Abstract Lights
    "https://picsum.photos/id/21/1024/768", // Bokeh
    "https://picsum.photos/id/3/1024/768", // Desk
];

const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
    const [foregroundImage, setForegroundImage] = useState<ImageFile | null>(null);
    const [cartoonVersion, setCartoonVersion] = useState<ImageFile | null>(null);
    const [finalImage, setFinalImage] = useState<ImageFile | null>(null);
    
    const [background, setBackground] = useState<BackgroundOption>({ type: 'preset', value: PRESET_BACKGROUNDS[0] });
    const [customBg, setCustomBg] = useState<ImageFile | null>(null);
    
    const [useCartoonEffect, setUseCartoonEffect] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [activeBgTab, setActiveBgTab] = useState<BackgroundType>('preset');

    const handleReset = () => {
        setOriginalImage(null);
        setForegroundImage(null);
        setCartoonVersion(null);
        setFinalImage(null);
        setCustomBg(null);
        setUseCartoonEffect(false);
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
        setActiveBgTab('preset');
        setBackground({ type: 'preset', value: PRESET_BACKGROUNDS[0] });
    };

    const handleImageUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsLoading(true);
        setLoadingMessage('Removing background...');

        try {
            const imageFile = await fileToImageFile(file);
            setOriginalImage(imageFile);

            const fgImage = await removeBackground(imageFile);
            if (!fgImage) {
                throw new Error("Failed to remove background. The AI couldn't process the image.");
            }
            setForegroundImage(fgImage);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during background removal.");
            handleReset();
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, []);

    const handleCustomBgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const bgFile = await fileToImageFile(file);
            setCustomBg(bgFile);
            setBackground({ type: 'upload', value: 'custom' });
        } catch (err) {
            setError("Failed to load custom background.");
        }
    };
    
    const generateFinalImage = async () => {
        if (!foregroundImage) return;

        setError(null);
        setIsLoading(true);
        setFinalImage(null);

        try {
            let activeForeground = foregroundImage;
            if (useCartoonEffect) {
                setLoadingMessage('Applying cartoon magic...');
                // Use cached cartoon version if available
                const cartoon = cartoonVersion || await cartoonifyImage(foregroundImage);
                if (!cartoon) throw new Error("Failed to create cartoon version.");
                setCartoonVersion(cartoon);
                activeForeground = cartoon;
            }

            setLoadingMessage('Compositing your masterpiece...');
            let result: ImageFile | null = null;
            if (background.type === 'color') {
                result = await combineImageAndColor(activeForeground, background.value);
            } else {
                let bgImage: ImageFile | null = null;
                if (background.type === 'preset') {
                    bgImage = await urlToImageFile(background.value);
                } else if (background.type === 'upload' && customBg) {
                    bgImage = customBg;
                }
                
                if (!bgImage) throw new Error("Selected background is not available.");
                result = await combineImageAndBackground(activeForeground, bgImage);
            }

            if (!result) throw new Error("Failed to generate the final image.");
            setFinalImage(result);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during final image generation.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const renderImage = (image: ImageFile | null, alt: string, isForeground: boolean = false) => {
        if (!image) return <div className={`w-full h-full bg-gray-700 rounded-lg ${isForeground ? 'checkerboard' : ''}`} />;
        return <img src={`data:${image.mimeType};base64,${image.base64}`} alt={alt} className="max-w-full max-h-full object-contain" />;
    };
    
    const imageToDisplay = useMemo(() => {
        if (finalImage) return finalImage;
        if (useCartoonEffect && cartoonVersion) return cartoonVersion;
        return foregroundImage;
    }, [finalImage, foregroundImage, useCartoonEffect, cartoonVersion]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8 flex flex-col items-center">
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
                    <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg">{loadingMessage}</p>
                </div>
            )}

            <header className="w-full max-w-5xl text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center gap-3">
                    <SparkleIcon className="w-8 h-8"/> AI Background Editor
                </h1>
                <p className="text-gray-400 mt-2">Upload a photo, and let AI work its magic.</p>
            </header>
            
            <main className="w-full max-w-5xl flex-grow">
                {!foregroundImage ? (
                    <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
                        <label htmlFor="image-upload" className="group relative w-full max-w-lg cursor-pointer rounded-xl border-2 border-dashed border-gray-600 bg-gray-800 hover:border-blue-500 transition-all duration-300 p-8 text-center flex flex-col justify-center items-center">
                            <UploadIcon className="w-12 h-12 text-gray-500 group-hover:text-blue-500 transition-colors" />
                            <p className="mt-4 text-lg font-semibold text-gray-300">Drag & drop or click to upload</p>
                            <p className="text-sm text-gray-500">PNG, JPG, WEBP supported</p>
                            <input id="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 bg-gray-800 p-6 rounded-xl space-y-6">
                            {/* Background Controls */}
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Background</h2>
                                <div className="flex bg-gray-700 rounded-lg p-1">
                                    {(['preset', 'color', 'upload'] as BackgroundType[]).map(tab => (
                                        <button key={tab} onClick={() => setActiveBgTab(tab)} className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${activeBgTab === tab ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4">
                                    {activeBgTab === 'preset' && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {PRESET_BACKGROUNDS.map(url => (
                                                <img key={url} src={url} alt="Preset background" onClick={() => setBackground({ type: 'preset', value: url })} className={`w-full h-16 object-cover rounded-md cursor-pointer border-2 ${background.value === url ? 'border-blue-500' : 'border-transparent hover:border-gray-500'}`} />
                                            ))}
                                        </div>
                                    )}
                                    {activeBgTab === 'color' && (
                                        <div className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg">
                                            <input type="color" value={background.type === 'color' ? background.value : '#ffffff'} onChange={(e) => setBackground({ type: 'color', value: e.target.value })} className="w-10 h-10 p-0 border-none rounded cursor-pointer bg-transparent" style={{'WebkitAppearance': 'none'}} />
                                            <span className="font-mono text-gray-300">{background.type === 'color' ? background.value : 'Select a color'}</span>
                                        </div>
                                    )}
                                    {activeBgTab === 'upload' && (
                                        <label htmlFor="bg-upload" className="w-full block text-center py-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                                            {customBg ? `Loaded: background.jpg` : 'Upload Custom Image'}
                                            <input id="bg-upload" type="file" className="sr-only" accept="image/*" onChange={handleCustomBgUpload} />
                                        </label>
                                    )}
                                </div>
                            </div>
                            {/* Effects Controls */}
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Effects</h2>
                                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                    <label htmlFor="cartoon-toggle" className="font-medium text-gray-200">Cartoon Style</label>
                                    <button onClick={() => setUseCartoonEffect(!useCartoonEffect)} id="cartoon-toggle" className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${useCartoonEffect ? 'bg-purple-600' : 'bg-gray-600'}`}>
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${useCartoonEffect ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-gray-700 space-y-3">
                                <button onClick={generateFinalImage} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105">
                                    <SparkleIcon className="w-5 h-5" />
                                    Generate Masterpiece
                                </button>
                                {finalImage && (
                                     <a href={`data:${finalImage.mimeType};base64,${finalImage.base64}`} download="edited-image.png" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all">
                                        <DownloadIcon />
                                        Download Image
                                    </a>
                                )}
                                <button onClick={handleReset} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all">
                                    <ResetIcon />
                                    Start Over
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-8 bg-gray-800 p-2 rounded-xl flex items-center justify-center aspect-w-4 aspect-h-3 min-h-[300px] lg:min-h-0">
                           <div className={`relative w-full h-full flex items-center justify-center ${!finalImage ? 'checkerboard' : ''} rounded-lg`}>
                              {renderImage(imageToDisplay, "Generated image", !finalImage)}
                              {error && <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm">{error}</div>}
                           </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
