"use client";

import { useState, useEffect } from "react";
import Camera from "@/components/Camera";
import PromptForm from "@/components/PromptForm";

const Home = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState("");
  const [selectedDrawingStyle, setSelectedDrawingStyle] = useState("");
  const [selectedFantasy, setSelectedFantasy] = useState("");
  const [strength, setStrength] = useState(0.5);
  const [guidanceScale, setGuidanceScale] = useState(13);
  const [step, setStep] = useState(1);
  const [stopCamera, setStopCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const environmentOptions = [
    { id: "environment-jungle", value: "Jungle", title: "Jungle" },
    { id: "environment-space", value: "Space", title: "Space" },
    { id: "environment-underwater", value: "Underwater", title: "Underwater" },
    { id: "environment-desert", value: "Desert", title: "Desert" },
  ];

  const drawingStyleOptions = [
    { id: "style-cartoon", value: "Cartoon", title: "Cartoon" },
    { id: "style-artsy", value: "Artsy", title: "Artsy" },
    { id: "style-realistic", value: "Realistic", title: "Realistic" },
    { id: "style-surreal", value: "Surreal", title: "Surreal" },
  ];

  const fantasyOptions = [
    {
      id: "cyberpunk",
      value:
        "A neon-lit cyberpunk city at night, with rain-slicked streets, towering skyscrapers, holographic advertisements, people with futuristic attire, vibrant colors, reflections on wet pavement, cinematic, Blade Runner aesthetic.",
      title: "Cyberpunk",
    },
    {
      id: "medieval-village",
      value:
        "A bustling medieval village marketplace during the day, with cobblestone streets, people wearing historical clothing, wooden stalls selling fruits and vegetables, a castle visible in the background, lively and detailed, Renaissance-style art.",
      title: "Medieval",
    },
    {
      id: "magic-forest",
      value:
        "A mystical forest at twilight with glowing mushrooms, soft purple and blue light filtering through the trees, fireflies, ethereal and enchanted atmosphere, highly detailed, fantasy illustration.",
      title: "Magic",
    },
    {
      id: "alien-world",
      value:
        "A surreal alien landscape with bioluminescent plants, unusual rock formations, a vibrant purple sky with two moons, otherworldly atmosphere, sci-fi fantasy, glowing details.",
      title: "Alien",
    },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (step === 1) {
      setPhoto(null);
      setStopCamera(false);
      setSelectedEnvironment("");
      setSelectedDrawingStyle("");
      setSelectedFantasy("");
    }
  }, [step]);

  const getPhoto = async () => {
    try {
      const response = await fetch(`http://localhost:5000/take_photo`);
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setPhoto(imageUrl);
      setStopCamera(true);
      setStep(2);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const sendPhotoWithTags = async () => {
    if (!photo) return;

    setLoading(true);
    const tags = `${selectedEnvironment}`;

    try {
      const blob = await fetch(photo).then((res) => res.blob());
      const formData = new FormData();
      formData.append("image", blob, "captured_image.jpg");
      formData.append("tags", tags);
      formData.append("strength", strength.toString());
      formData.append("guidance_scale", guidanceScale.toString());
      const response = await fetch(`http://localhost:5000/generate_image`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setPhoto(imageUrl);
        console.log("Generated image received and displayed!");
        setStep(7);
      } else {
        console.error("Failed to generate image");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setStep(1);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center w-full max-h-screen text-black">
      <div className="flex h-screen w-full">
        <div className="flex w-full bg-[#f5f5f5] relative">
          <div className="flex items-center justify-center w-full max-h-screen overflow-hidden">
            {!photo ? (
              <Camera stopCamera={stopCamera} />
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                <img
                  src={photo}
                  alt="Failed to generate an image"
                  className="w-full h-full object-cover"
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-600 bg-opacity-40 backdrop-blur-md text-white text-lg">
                    Generating image, please wait...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col p-8 w-6/12 bg-white">
          {step === 1 && (
            <div className="flex flex-col h-full w-full justify-end">
              <button
                onClick={getPhoto}
                className="p-3 w-full bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Take photo
              </button>
            </div>
          )}

          {step === 2 && (
            <PromptForm
              title="Select an environment"
              options={environmentOptions}
              selectedOption={selectedEnvironment}
              setSelectedOption={setSelectedEnvironment}
              onNext={() => selectedEnvironment && setStep(3)}
              onBack={goBack}
              onRetakePhoto={retakePhoto}
            />
          )}

          {step === 3 && (
            <PromptForm
              title="Select a style"
              options={drawingStyleOptions}
              selectedOption={selectedDrawingStyle}
              setSelectedOption={setSelectedDrawingStyle}
              onNext={() => selectedDrawingStyle && setStep(4)}
              onBack={goBack}
              onRetakePhoto={retakePhoto}
            />
          )}

          {step === 4 && (
            <PromptForm
              title="Select an imaginary realm"
              options={fantasyOptions}
              selectedOption={selectedFantasy}
              setSelectedOption={setSelectedFantasy}
              onNext={() => selectedFantasy && setStep(5)}
              onBack={goBack}
              onRetakePhoto={retakePhoto}
            />
          )}

          {step === 5 && (
            <div className="flex flex-col h-full w-full justify-between">
              <div className="flex justify-between">
                <button
                  onClick={goBack}
                  className="p-5 border rounded text-neutral-400"
                >
                  <svg
                    className="w-4 h-4 rotate-180"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9"
                    />
                  </svg>
                </button>
                <button onClick={retakePhoto} className="p-5 border rounded">
                  <img className="w-4 h-4" src="refresh.svg" alt="refresh" />
                </button>
              </div>
              <label className="flex flex-col mb-4">
                <span>Strength (0-1):</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  className="mt-2"
                />
                <span>{strength}</span>
              </label>
              <label className="flex flex-col mb-4">
                <span>Guidance Scale (1-15):</span>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.1"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  className="mt-2"
                />
                <span>{guidanceScale}</span>
              </label>
              <button
                onClick={() => setStep(6)}
                className="p-3 w-full bg-blue-500 text-white rounded hover:bg-blue-600 mt-4"
              >
                Next
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col h-full w-full justify-between">
              <div className="flex justify-between">
                <button
                  onClick={goBack}
                  className="p-5 border rounded text-neutral-400"
                >
                  <svg
                    className="w-4 h-4 rotate-180"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9"
                    />
                  </svg>
                </button>
                <button onClick={retakePhoto} className="p-5 border rounded">
                  <img className="w-4 h-4" src="refresh.svg" alt="refresh" />
                </button>
              </div>

              <button
                onClick={sendPhotoWithTags}
                className={`p-3 rounded mt-4 text-white 
                ${
                  loading
                    ? "bg-green-300 cursor-not-allowed opacity-50"
                    : "bg-green-500 hover:bg-green-600"
                }`}
                disabled={
                  !photo ||
                  !selectedEnvironment ||
                  !selectedDrawingStyle ||
                  loading
                }
              >
                Generate Image
              </button>
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col h-full w-full justify-end">
              <button
                onClick={retakePhoto}
                className="p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 mt-4"
              >
                Take a new photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
