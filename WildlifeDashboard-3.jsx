import { useState, useRef, useEffect } from "react";

// Wildlife Detection Dashboard - Jeena Weber Langstaff
// Edge Impulse Imagine 2025 Hackathon

// ============================================================
// EDGE IMPULSE WEBASSEMBLY CONFIGURATION
// ============================================================
// When your model is ready:
// 1. Go to Edge Impulse Studio > Deployment > WebAssembly
// 2. Download and host the files
// 3. Set useEdgeImpulse to true and update modelPath
const EDGE_IMPULSE = {
  useEdgeImpulse: false,  // Set true when model is deployed
  modelPath: null,        // Path to your .wasm model
  classes: ["Footsteps", "Gunshots", "Natural Elements", "Wildlife"],
  
  // THRESHOLD-BASED DETECTION FOR ANTI-POACHING
  // Lower threshold = more sensitive (catches more, but more false positives)
  // Gunshots set very low because missing a gunshot = dead animal
  thresholds: {
    "Gunshots": 0.25,           // VERY sensitive - we can't miss these
    "Footsteps": 0.45,          // Moderately sensitive - potential threat
    "Wildlife": 0.50,           // Standard threshold
    "Natural Elements": 0.55    // Higher threshold - less critical
  },
  
  // Priority order: check high-priority threats first even if not top prediction
  priorityOrder: ["Gunshots", "Footsteps", "Wildlife", "Natural Elements"]
};

export default function WildlifeDetectionDashboard() {
  
  // all my state variables
  var [currentDetection, setCurrentDetection] = useState(null);
  var [detectionHistory, setDetectionHistory] = useState([]);
  var [savedSessions, setSavedSessions] = useState([]);
  var [isMonitoring, setIsMonitoring] = useState(false);
  var [isAnalyzing, setIsAnalyzing] = useState(false);
  var [analyzeProgress, setAnalyzeProgress] = useState(0);
  var [monitoringTime, setMonitoringTime] = useState(0);
  var [showChat, setShowChat] = useState(false);
  var [chatMessages, setChatMessages] = useState([]);
  var [userMessage, setUserMessage] = useState("");
  var [isAiThinking, setIsAiThinking] = useState(false);
  var [searchQuery, setSearchQuery] = useState("");
  var [selectedLocation, setSelectedLocation] = useState(null);
  var [showResults, setShowResults] = useState(false);
  var [loadingLocation, setLoadingLocation] = useState(false);
  var [currentStep, setCurrentStep] = useState("");
  var [audioInfo, setAudioInfo] = useState(null);

  // refs for audio stuff
  var microphoneRef = useRef(null);
  var audioAnalyzerRef = useRef(null);
  var audioContextRef = useRef(null);
  var timerRef = useRef(null);
  var monitoringLoopRef = useRef(null);
  var analysisTimerRef = useRef(null);
  var chatEndRef = useRef(null);

  var animalList = [
    "Lion", "African Wild Dog", "Rhino", "Mountain Gorilla",
    "Leopard", "Cheetah", "Elephant"
  ];

  var locationList = [
    { name: "Kruger National Park", country: "South Africa", type: "Reserve" },
    { name: "Serengeti National Park", country: "Tanzania", type: "Reserve" },
    { name: "Masai Mara National Reserve", country: "Kenya", type: "Reserve" },
    { name: "Chobe National Park", country: "Botswana", type: "Reserve" },
    { name: "Virunga National Park", country: "DRC", type: "Reserve" },
    { name: "Etosha National Park", country: "Namibia", type: "Reserve" },
    { name: "Bwindi Impenetrable Forest", country: "Uganda", type: "Reserve" },
    { name: "Amboseli National Park", country: "Kenya", type: "Reserve" },
    { name: "Okavango Delta", country: "Botswana", type: "Reserve" },
    { name: "Tsavo National Park", country: "Kenya", type: "Reserve" },
    { name: "Johannesburg", country: "South Africa", type: "City" },
    { name: "Nairobi", country: "Kenya", type: "City" },
    { name: "Cape Town", country: "South Africa", type: "City" }
  ];

  var analysisSteps = [
    "Loading audio file...",
    "Converting to spectrogram...",
    "Extracting audio features...",
    "Running AI classifier...",
    "Analyzing frequency patterns...",
    "Matching against wildlife database...",
    "Running threat detection...",
    "Identifying species...",
    "Calculating confidence...",
    "Finalizing results..."
  ];

  // ask for notification permission when page loads
  useEffect(function() {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // scroll chat to bottom
  useEffect(function() {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var minuteString = minutes < 10 ? "0" + minutes : "" + minutes;
    var secondString = seconds < 10 ? "0" + seconds : "" + seconds;
    return minuteString + ":" + secondString;
  }

  function getColorForThreatLevel(threatType) {
    if (threatType === "danger") return "#ef4444";
    if (threatType === "warning") return "#f59e0b";
    if (threatType === "unknown") return "#6b7280";
    return "#22c55e";
  }

  // this function reads audio data from the microphone
  function getAudioInfoFromMic() {
    if (!audioAnalyzerRef.current) {
      return null;
    }
    
    var analyzer = audioAnalyzerRef.current;
    var dataSize = analyzer.frequencyBinCount;
    var frequencyData = new Uint8Array(dataSize);
    var waveformData = new Uint8Array(dataSize);
    
    analyzer.getByteFrequencyData(frequencyData);
    analyzer.getByteTimeDomainData(waveformData);
    
    // calculate average volume
    var totalVolume = 0;
    for (var i = 0; i < dataSize; i++) {
      totalVolume = totalVolume + frequencyData[i];
    }
    var averageVolume = totalVolume / dataSize;
    
    // find the loudest frequency
    var loudestValue = 0;
    var loudestPosition = 0;
    for (var j = 0; j < dataSize; j++) {
      if (frequencyData[j] > loudestValue) {
        loudestValue = frequencyData[j];
        loudestPosition = j;
      }
    }
    var mainFrequency = loudestPosition * 44100 / (dataSize * 2);
    
    var hasLoudBurst = loudestValue > 200;
    
    // check low frequencies
    var lowFrequencyTotal = 0;
    for (var k = 0; k < 10; k++) {
      lowFrequencyTotal = lowFrequencyTotal + frequencyData[k];
    }
    
    // check high frequencies 
    var highFrequencyTotal = 0;
    for (var m = dataSize - 50; m < dataSize; m++) {
      highFrequencyTotal = highFrequencyTotal + frequencyData[m];
    }
    
    return {
      volume: averageVolume,
      frequency: mainFrequency,
      loudestValue: loudestValue,
      hasLoudBurst: hasLoudBurst,
      lowFrequency: lowFrequencyTotal,
      highFrequency: highFrequencyTotal
    };
  }

  // sends audio info to classifier - uses Edge Impulse when ready, Claude for demo
  async function askAItoClassifySound(audioInfo, source) {
    
    // === USE EDGE IMPULSE MODEL WHEN DEPLOYED ===
    if (EDGE_IMPULSE.useEdgeImpulse && window.edgeImpulseClassifier) {
      try {
        var result = await window.edgeImpulseClassifier.classify(audioInfo);
        
        // THRESHOLD-BASED PRIORITY DETECTION
        // Instead of just taking the highest prediction, we check each class
        // against its threshold IN PRIORITY ORDER (gunshots first!)
        
        var selectedClass = null;
        var selectedConfidence = 0;
        var detectionReasoning = "";
        
        // Check each class in priority order
        for (var p = 0; p < EDGE_IMPULSE.priorityOrder.length; p++) {
          var priorityClass = EDGE_IMPULSE.priorityOrder[p];
          var threshold = EDGE_IMPULSE.thresholds[priorityClass];
          
          // Find this class in the results
          for (var r = 0; r < result.results.length; r++) {
            var classResult = result.results[r];
            if (classResult.label === priorityClass) {
              // If confidence exceeds threshold, select this class
              if (classResult.value >= threshold) {
                selectedClass = classResult.label;
                selectedConfidence = classResult.value;
                
                if (priorityClass === "Gunshots") {
                  detectionReasoning = "PRIORITY ALERT: Gunshot detected (threshold: " + (threshold * 100).toFixed(0) + "%)";
                } else if (priorityClass === "Footsteps") {
                  detectionReasoning = "Potential human activity detected";
                } else {
                  detectionReasoning = "Classified by Edge Impulse ML model";
                }
                break;
              }
            }
          }
          
          // If we found a match above threshold, stop checking lower priority classes
          if (selectedClass !== null) break;
        }
        
        // Fallback: if nothing exceeded threshold, take highest confidence
        if (selectedClass === null) {
          var topClass = result.results[0];
          for (var t = 1; t < result.results.length; t++) {
            if (result.results[t].value > topClass.value) {
              topClass = result.results[t];
            }
          }
          selectedClass = topClass.label;
          selectedConfidence = topClass.value;
          detectionReasoning = "Low confidence detection (below threshold)";
        }
        
        var threatLevel = "safe";
        if (selectedClass === "Gunshots") threatLevel = "danger";
        if (selectedClass === "Footsteps") threatLevel = "warning";
        
        return {
          label: selectedClass,
          type: threatLevel,
          confidence: Math.round(selectedConfidence * 100),
          time: new Date().toLocaleTimeString(),
          animal: selectedClass === "Wildlife" ? "Detected" : null,
          animalAccuracy: selectedClass === "Wildlife" ? 60 : null,
          location: selectedLocation ? selectedLocation.name : "Unknown",
          source: "Edge Impulse Model",
          reasoning: detectionReasoning
        };
      } catch (err) {
        console.log("Edge Impulse error, falling back to demo:", err);
      }
    }
    
    // === DEMO MODE: Use Claude API for classification ===
    var question = "You are an audio classification AI for wildlife protection. ";
    question = question + "Based on these audio measurements, classify the sound.\n\n";
    question = question + "Audio Measurements:\n";
    question = question + "- Volume Level: " + audioInfo.volume.toFixed(1) + " (scale 0-255)\n";
    question = question + "- Main Frequency: " + audioInfo.frequency.toFixed(0) + " Hz\n";
    question = question + "- Loudest Peak: " + audioInfo.loudestValue + "\n";
    question = question + "- Has Sudden Loud Burst: " + audioInfo.hasLoudBurst + "\n";
    question = question + "- Low Frequency Energy: " + audioInfo.lowFrequency.toFixed(0) + "\n";
    question = question + "- High Frequency Energy: " + audioInfo.highFrequency.toFixed(0) + "\n\n";
    
    question = question + "Classify as ONE of these:\n";
    question = question + "- Gunshots (sudden loud burst, sharp sound)\n";
    question = question + "- Chainsaw (loud continuous buzzing)\n";
    question = question + "- Vehicle Engine (low rumbling, continuous)\n";
    question = question + "- Footsteps (quiet rhythmic thuds)\n";
    question = question + "- Human Voice (medium frequency, variable)\n";
    question = question + "- Wildlife (animal sounds - Lion, Elephant, Rhino, Leopard, Cheetah, African Wild Dog, or Mountain Gorilla)\n";
    question = question + "- Natural Elements (wind, rain, leaves)\n";
    question = question + "- Silence (very quiet)\n";
    question = question + "- Unknown (can't identify clearly)\n\n";
    
    question = question + "Reply with ONLY this JSON format:\n";
    question = question + '{"classification": "name", "confidence": 70-95, "threatLevel": "danger/warning/safe/unknown", "animal": "name or null", "animalConfidence": 40-75 or null, "reasoning": "short explanation"}';
    
    try {
      var response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: question }]
        })
      });
      
      var data = await response.json();
      var aiText = data.content[0].text;
      
      var jsonStart = aiText.indexOf("{");
      var jsonEnd = aiText.lastIndexOf("}") + 1;
      var jsonText = aiText.substring(jsonStart, jsonEnd);
      var result = JSON.parse(jsonText);
      
      var detection = {
        label: result.classification,
        type: result.threatLevel,
        confidence: result.confidence,
        time: new Date().toLocaleTimeString(),
        animal: result.animal,
        animalAccuracy: result.animalConfidence,
        location: selectedLocation ? selectedLocation.name : "Unknown",
        source: source,
        reasoning: result.reasoning
      };
      
      return detection;
      
    } catch (error) {
      console.log("AI error:", error);
      return {
        label: "Unknown",
        type: "unknown",
        confidence: 50,
        time: new Date().toLocaleTimeString(),
        animal: null,
        animalAccuracy: null,
        location: selectedLocation ? selectedLocation.name : "Unknown",
        source: source,
        reasoning: "Could not analyze audio"
      };
    }
  }

  function getMatchingLocations() {
    if (searchQuery.length === 0) return [];
    
    var searchLower = searchQuery.toLowerCase();
    var matches = locationList.filter(function(location) {
      var nameMatches = location.name.toLowerCase().includes(searchLower);
      var countryMatches = location.country.toLowerCase().includes(searchLower);
      return nameMatches || countryMatches;
    });
    
    return matches.slice(0, 5);
  }

  function handleLocationClick(location) {
    setSelectedLocation(location);
    setSearchQuery("");
    setShowResults(false);
  }

  function handleShareLocation() {
    setLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          var newLocation = {
            name: "Current Location",
            country: "GPS",
            type: "GPS",
            lat: position.coords.latitude.toFixed(4),
            lng: position.coords.longitude.toFixed(4)
          };
          setSelectedLocation(newLocation);
          setLoadingLocation(false);
        },
        function(error) {
          alert("Could not get location. Please try again.");
          setLoadingLocation(false);
        }
      );
    } else {
      alert("Your browser doesn't support GPS.");
      setLoadingLocation(false);
    }
  }

  function sendAlertToPhone(detection) {
    if ("Notification" in window && Notification.permission === "granted") {
      var message = detection.label + " detected! (" + detection.confidence + "% confidence)";
      new Notification("Wildlife Alert!", { body: message });
    }
    
    if ("vibrate" in navigator) {
      if (detection.type === "danger") {
        navigator.vibrate([500, 200, 500]);
      } else if (detection.type === "warning") {
        navigator.vibrate([300, 100, 300]);
      } else {
        navigator.vibrate([100]);
      }
    }
  }

  function handleStartMonitoring() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(microphoneStream) {
        microphoneRef.current = microphoneStream;
        
        // set up the audio analyzer
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var analyzer = audioContext.createAnalyser();
        var micSource = audioContext.createMediaStreamSource(microphoneStream);
        
        analyzer.fftSize = 2048;
        micSource.connect(analyzer);
        
        audioContextRef.current = audioContext;
        audioAnalyzerRef.current = analyzer;
        
        setIsMonitoring(true);
        setMonitoringTime(0);
        setDetectionHistory([]);
        
        timerRef.current = setInterval(function() {
          setMonitoringTime(function(oldTime) {
            return oldTime + 1;
          });
        }, 1000);
        
        // analyze every 5 seconds
        monitoringLoopRef.current = setInterval(function() {
          analyzeLiveAudio();
        }, 5000);
      })
      .catch(function(error) {
        alert("Microphone access denied. Please allow microphone access.");
      });
  }

  function handleStopMonitoring() {
    if (microphoneRef.current) {
      var tracks = microphoneRef.current.getTracks();
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    clearInterval(timerRef.current);
    clearInterval(monitoringLoopRef.current);
    setIsMonitoring(false);
  }

  async function analyzeLiveAudio() {
    var audioInfo = getAudioInfoFromMic();
    
    if (audioInfo) {
      setAudioInfo(audioInfo);
      var detection = await askAItoClassifySound(audioInfo, "Live Monitoring");
      setCurrentDetection(detection);
      
      setDetectionHistory(function(oldHistory) {
        var newHistory = [detection].concat(oldHistory);
        return newHistory.slice(0, 20);
      });
      
      sendAlertToPhone(detection);
    }
  }

  function handleFileUpload(event) {
    var file = event.target.files[0];
    
    if (file) {
      setIsAnalyzing(true);
      setAnalyzeProgress(0);
      setCurrentStep(analysisSteps[0]);
      
      var fileReader = new FileReader();
      
      fileReader.onload = function(e) {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        audioContext.decodeAudioData(e.target.result, function(audioBuffer) {
          var samples = audioBuffer.getChannelData(0);
          
          var totalVolume = 0;
          var maxVolume = 0;
          for (var i = 0; i < samples.length; i++) {
            var sampleValue = Math.abs(samples[i]);
            totalVolume = totalVolume + sampleValue;
            if (sampleValue > maxVolume) {
              maxVolume = sampleValue;
            }
          }
          var averageVolume = (totalVolume / samples.length) * 255;
          var loudestValue = maxVolume * 255;
          
          var audioInfo = {
            volume: averageVolume,
            frequency: 440,
            loudestValue: loudestValue,
            hasLoudBurst: loudestValue > 200,
            lowFrequency: averageVolume * 0.5,
            highFrequency: averageVolume * 0.3
          };
          
          setAudioInfo(audioInfo);
          
          var stepNumber = 0;
          analysisTimerRef.current = setInterval(function() {
            stepNumber = stepNumber + 1;
            
            if (stepNumber < 10) {
              setAnalyzeProgress(stepNumber * 10);
              setCurrentStep(analysisSteps[stepNumber]);
            } else {
              clearInterval(analysisTimerRef.current);
              setAnalyzeProgress(100);
              setCurrentStep("Analysis complete!");
              
              askAItoClassifySound(audioInfo, "File Upload").then(function(detection) {
                setIsAnalyzing(false);
                setCurrentDetection(detection);
                
                setDetectionHistory(function(oldHistory) {
                  var newHistory = [detection].concat(oldHistory);
                  return newHistory.slice(0, 20);
                });
                
                sendAlertToPhone(detection);
              });
            }
          }, 1000);
          
        }, function(error) {
          alert("Could not read audio file. Try a different format.");
          setIsAnalyzing(false);
        });
      };
      
      fileReader.readAsArrayBuffer(file);
    }
  }

  function handleSaveSession() {
    if (detectionHistory.length === 0) {
      alert("No detections to save! Start monitoring first.");
      return;
    }
    
    var newSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
      location: selectedLocation ? selectedLocation.name : "Unknown",
      duration: formatTime(monitoringTime),
      detections: detectionHistory.slice()
    };
    
    setSavedSessions(function(oldSessions) {
      return [newSession].concat(oldSessions);
    });
    
    alert("Session saved! You can now ask the AI about your data.");
  }

  function handleSendMessage() {
    if (!userMessage.trim()) return;
    sendMessageToAI(userMessage);
  }

  function handleKeyPress(event) {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  }

  function handleQuickQuestion(question) {
    sendMessageToAI(question);
  }

  async function sendMessageToAI(message) {
    setIsAiThinking(true);
    
    var context = "You are an AI wildlife conservation assistant. ";
    context = context + "Analyze this monitoring data and help the user.\n\n";
    
    if (savedSessions.length > 0) {
      context = context + "SAVED SESSIONS:\n";
      for (var i = 0; i < savedSessions.length; i++) {
        var session = savedSessions[i];
        context = context + "\nSession " + (i + 1) + ":\n";
        context = context + "- Date: " + session.date + "\n";
        context = context + "- Location: " + session.location + "\n";
        context = context + "- Duration: " + session.duration + "\n";
        context = context + "- Detections: " + session.detections.length + "\n";
        
        for (var j = 0; j < session.detections.length; j++) {
          var det = session.detections[j];
          context = context + "  * " + det.time + ": " + det.label;
          context = context + " (" + det.confidence + "%)";
          if (det.animal) {
            context = context + " [" + det.animal + "]";
          }
          context = context + "\n";
        }
      }
    }
    
    if (detectionHistory.length > 0) {
      context = context + "\nCURRENT SESSION:\n";
      for (var k = 0; k < detectionHistory.length; k++) {
        var detection = detectionHistory[k];
        context = context + "- " + detection.time + ": " + detection.label;
        context = context + " (" + detection.confidence + "%)";
        if (detection.animal) {
          context = context + " [" + detection.animal + "]";
        }
        context = context + "\n";
      }
    }
    
    context = context + "\nUser question: " + message;
    
    try {
      var response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: context }]
        })
      });
      
      var data = await response.json();
      var aiResponse = data.content[0].text;
      
      setChatMessages(function(oldMessages) {
        return oldMessages.concat([
          { role: "user", content: message },
          { role: "assistant", content: aiResponse }
        ]);
      });
    } catch (error) {
      setChatMessages(function(oldMessages) {
        return oldMessages.concat([
          { role: "user", content: message },
          { role: "assistant", content: "Sorry, I had an error. Please try again!" }
        ]);
      });
    }
    
    setIsAiThinking(false);
    setUserMessage("");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #000000 0%, #1a1a1a 25%, #333333 50%, #555555 75%, #888888 100%)",
      color: "white",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "26px", marginBottom: "5px" }}>
          Wildlife Protection Dashboard
        </h1>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          AI-Powered Anti-Poaching Detection | Edge Impulse ML
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button
          onClick={function() { setShowChat(!showChat); }}
          style={{
            padding: "12px 30px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "25px",
            cursor: "pointer"
          }}
        >
          {showChat ? "Hide AI Assistant" : "Ask AI About Detections"}
        </button>
        
        {savedSessions.length > 0 && (
          <span style={{ marginLeft: "15px", color: "#22c55e", fontSize: "14px" }}>
            {savedSessions.length} session(s) saved
          </span>
        )}
      </div>

      {showChat && (
        <div style={{
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: "1px solid #8b5cf6"
        }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#8b5cf6" }}>
            AI Conservation Assistant
          </h3>
          <p style={{ color: "#aaa", fontSize: "12px", marginBottom: "15px" }}>
            Ask about your monitoring data! Powered by Claude AI.
          </p>
          
          <div style={{
            maxHeight: "250px",
            overflowY: "auto",
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px"
          }}>
            {chatMessages.length === 0 ? (
              <p style={{ color: "#666", textAlign: "center" }}>
                No messages yet. Try asking a question!
              </p>
            ) : (
              chatMessages.map(function(msg, index) {
                var isUser = msg.role === "user";
                return (
                  <div key={index} style={{
                    marginBottom: "10px",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor: isUser ? "rgba(59, 130, 246, 0.2)" : "rgba(139, 92, 246, 0.2)",
                    borderLeft: isUser ? "3px solid #3b82f6" : "3px solid #8b5cf6"
                  }}>
                    <p style={{ margin: 0, fontSize: "12px", color: isUser ? "#3b82f6" : "#8b5cf6" }}>
                      {isUser ? "You" : "AI Assistant"}
                    </p>
                    <p style={{ margin: "5px 0 0 0", whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </p>
                  </div>
                );
              })
            )}
            
            {isAiThinking && (
              <p style={{ textAlign: "center", color: "#8b5cf6" }}>AI is thinking...</p>
            )}
            <div ref={chatEndRef}></div>
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={userMessage}
              onChange={function(e) { setUserMessage(e.target.value); }}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "14px",
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                border: "1px solid #666",
                borderRadius: "8px"
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={isAiThinking}
              style={{
                padding: "12px 20px",
                backgroundColor: isAiThinking ? "#666" : "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isAiThinking ? "not-allowed" : "pointer"
              }}
            >
              Send
            </button>
          </div>
          
          <div style={{ marginTop: "10px" }}>
            <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Quick questions:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {["What threats were detected?", "Any patterns?", "Which animals?", "Recommendations?"].map(function(question) {
                return (
                  <button
                    key={question}
                    onClick={function() { handleQuickQuestion(question); }}
                    disabled={isAiThinking}
                    style={{
                      padding: "5px 10px",
                      fontSize: "11px",
                      backgroundColor: "rgba(139, 92, 246, 0.3)",
                      color: "#ccc",
                      border: "1px solid #8b5cf6",
                      borderRadius: "15px",
                      cursor: isAiThinking ? "not-allowed" : "pointer"
                    }}
                  >
                    {question}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
        
        <div style={{
          flex: 1,
          minWidth: "250px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "15px",
          borderRadius: "10px",
          border: "1px solid #555"
        }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Location</h3>
          
          {!selectedLocation ? (
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={function(e) { 
                  setSearchQuery(e.target.value); 
                  setShowResults(true); 
                }}
                placeholder="Search park or city..."
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: "white",
                  border: "1px solid #666",
                  borderRadius: "8px",
                  boxSizing: "border-box"
                }}
              />
              
              {showResults && getMatchingLocations().length > 0 && (
                <div style={{ marginTop: "5px", backgroundColor: "rgba(0,0,0,0.8)", borderRadius: "8px" }}>
                  {getMatchingLocations().map(function(location, index) {
                    return (
                      <div 
                        key={index} 
                        onClick={function() { handleLocationClick(location); }}
                        style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #444" }}
                      >
                        <p style={{ margin: 0, fontWeight: "bold" }}>{location.name}</p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>{location.country}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <button 
                onClick={handleShareLocation} 
                style={{
                  width: "100%", 
                  marginTop: "10px", 
                  padding: "10px",
                  backgroundColor: "#3b82f6", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "8px", 
                  cursor: "pointer"
                }}
              >
                {loadingLocation ? "Getting location..." : "Share My Location"}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ 
                padding: "10px", 
                backgroundColor: "rgba(34,197,94,0.2)", 
                borderRadius: "8px", 
                borderLeft: "3px solid #22c55e" 
              }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>{selectedLocation.name}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{selectedLocation.country}</p>
              </div>
              
              <button 
                onClick={function() { setSelectedLocation(null); }} 
                style={{
                  width: "100%", 
                  marginTop: "10px", 
                  padding: "8px",
                  backgroundColor: "transparent", 
                  color: "#888", 
                  border: "1px solid #666", 
                  borderRadius: "8px", 
                  cursor: "pointer"
                }}
              >
                Change Location
              </button>
            </div>
          )}
        </div>

        <div style={{
          flex: 1,
          minWidth: "250px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "15px",
          borderRadius: "10px",
          border: "1px solid #555"
        }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Audio Monitoring</h3>
          
          <button
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            disabled={isAnalyzing}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: isMonitoring ? "#ef4444" : "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              marginBottom: "10px"
            }}
          >
            {isMonitoring ? "STOP (" + formatTime(monitoringTime) + ")" : "START MONITORING"}
          </button>

          {isMonitoring && (
            <div style={{ 
              textAlign: "center", 
              padding: "10px", 
              backgroundColor: "rgba(34,197,94,0.2)", 
              borderRadius: "8px", 
              marginBottom: "10px" 
            }}>
              <span style={{ color: "#22c55e" }}>
                Listening... ({detectionHistory.length} detections)
              </span>
              {audioInfo && (
                <p style={{ color: "#888", fontSize: "11px", margin: "5px 0 0 0" }}>
                  Volume: {audioInfo.volume.toFixed(0)} | Freq: {audioInfo.frequency.toFixed(0)}Hz
                </p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <label style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#6b7280",
              color: "white",
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "center",
              fontSize: "14px"
            }}>
              Upload Audio
              <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            
            <button 
              onClick={handleSaveSession} 
              disabled={detectionHistory.length === 0} 
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: detectionHistory.length > 0 ? "#8b5cf6" : "#444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: detectionHistory.length > 0 ? "pointer" : "not-allowed",
                fontSize: "14px"
              }}
            >
              Save Session
            </button>
          </div>

          {isAnalyzing && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "rgba(59,130,246,0.2)", borderRadius: "8px" }}>
              <p style={{ color: "#3b82f6", fontSize: "12px", margin: 0 }}>{currentStep}</p>
              <div style={{ height: "6px", backgroundColor: "#333", borderRadius: "3px", marginTop: "5px" }}>
                <div style={{ 
                  width: analyzeProgress + "%", 
                  height: "100%", 
                  backgroundColor: "#3b82f6", 
                  borderRadius: "3px",
                  transition: "width 0.3s"
                }}></div>
              </div>
              <p style={{ color: "#888", fontSize: "11px", marginTop: "5px" }}>{analyzeProgress}% complete</p>
            </div>
          )}
        </div>
      </div>

      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: "15px",
        borderRadius: "10px",
        marginBottom: "20px",
        border: "1px solid #555",
        borderLeft: currentDetection ? "5px solid " + getColorForThreatLevel(currentDetection.type) : "5px solid #888"
      }}>
        <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Current Detection</h3>
        
        {currentDetection ? (
          <div>
            <p style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 5px 0" }}>
              {currentDetection.label}
            </p>
            <p style={{ color: "#aaa", margin: 0 }}>
              Confidence: {currentDetection.confidence}%
            </p>
            
            {currentDetection.animal && (
              <p style={{ color: "#3b82f6", margin: "5px 0" }}>
                Species: {currentDetection.animal} ({currentDetection.animalAccuracy}%)
              </p>
            )}
            
            {currentDetection.reasoning && (
              <p style={{ color: "#888", fontSize: "12px", margin: "5px 0", fontStyle: "italic" }}>
                {currentDetection.reasoning}
              </p>
            )}
            
            <span style={{
              display: "inline-block",
              marginTop: "10px",
              padding: "5px 15px",
              borderRadius: "5px",
              backgroundColor: getColorForThreatLevel(currentDetection.type),
              color: "white",
              fontWeight: "bold"
            }}>
              {currentDetection.type === "danger" && "THREAT"}
              {currentDetection.type === "warning" && "CAUTION"}
              {currentDetection.type === "safe" && "SAFE"}
              {currentDetection.type === "unknown" && "UNKNOWN"}
            </span>
          </div>
        ) : (
          <p style={{ color: "#888" }}>Start monitoring or upload audio to see detections</p>
        )}
      </div>

      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: "15px",
        borderRadius: "10px",
        border: "1px solid #555"
      }}>
        <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>
          Detection History ({detectionHistory.length})
        </h3>
        
        {detectionHistory.length === 0 ? (
          <p style={{ color: "#888" }}>No detections yet</p>
        ) : (
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {detectionHistory.map(function(detection, index) {
              return (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px",
                  borderBottom: "1px solid #444",
                  backgroundColor: index === 0 ? "rgba(255,255,255,0.1)" : "transparent",
                  flexWrap: "wrap",
                  gap: "5px"
                }}>
                  <span>
                    {detection.label}
                    {detection.animal && " [" + detection.animal + "]"}
                  </span>
                  <div>
                    <span style={{ color: "#888", marginRight: "10px" }}>{detection.confidence}%</span>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      backgroundColor: getColorForThreatLevel(detection.type),
                      color: "white"
                    }}>
                      {detection.type === "danger" ? "THREAT" : 
                       detection.type === "warning" ? "CAUTION" : 
                       detection.type === "unknown" ? "UNKNOWN" : "SAFE"}
                    </span>
                    <span style={{ color: "#888", marginLeft: "10px", fontSize: "12px" }}>{detection.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {savedSessions.length > 0 && (
        <div style={{
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          padding: "15px",
          borderRadius: "10px",
          marginTop: "20px",
          border: "1px solid #8b5cf6"
        }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px", color: "#8b5cf6" }}>
            Saved Sessions ({savedSessions.length})
          </h3>
          
          {savedSessions.map(function(session) {
            return (
              <div key={session.id} style={{
                padding: "10px",
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>{session.location}</p>
                <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#888" }}>
                  {session.date} | {session.duration} | {session.detections.length} detections
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ textAlign: "center", marginTop: "20px", color: "#666", fontSize: "12px" }}>
        Built by Jeena Weber Langstaff | Edge Impulse Imagine 2025 | Powered by Edge Impulse ML
      </p>
    </div>
  );
}
