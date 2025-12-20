import { useState, useRef } from 'react'

function App() {
  var [isMonitoring, setIsMonitoring] = useState(false)
  var [location, setLocation] = useState(null)
  var [audioFile, setAudioFile] = useState(null)
  var [currentDetection, setCurrentDetection] = useState(null)
  var [isAnalyzing, setIsAnalyzing] = useState(false)
  var microphoneRef = useRef(null)
  var audioContextRef = useRef(null) 

  var wildlifeData = {
    "Lion": {
      image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400"
    },
    "Elephant": {
      image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400"
    },
    "Rhino": {
      image: "https://images.unsplash.com/photo-1598894000329-81adab9c8592?w=400"
    },
    "Leopard": {
      image: "https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=400"
    },
    "Cheetah": {
      image: "https://images.unsplash.com/photo-1475359524104-d101d02a042b?w=400"
    },
    "African Wild Dog": {
      image: "https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?w=400"
    },
    "Mountain Gorilla": {
      image: "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=400"
    },
    "Birds": {
      image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400"
    }
  }

  function handleGetLocation() {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      function(error) {
        alert("Could not get location")
      }
    )
  }

  function handleFileUpload(event) {
    var file = event.target.files[0]
    if (file) {
      setAudioFile(file)
      setIsAnalyzing(true)
      
      setTimeout(function() {
        var animals = ["Lion", "Elephant", "Rhino", "Leopard", "Cheetah", "African Wild Dog", "Mountain Gorilla", "Birds"]
        var randomAnimal = animals[Math.floor(Math.random() * animals.length)]
        
        setCurrentDetection({
          animal: randomAnimal,
          confidence: Math.floor(Math.random() * 20) + 75,
          type: "safe"
        })
        setIsAnalyzing(false)
      }, 2000)
    }
  }

  function handleStartMonitoring() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        microphoneRef.current = stream
        audioContextRef.current = new AudioContext()
        setIsMonitoring(true)
        
        var interval = setInterval(function() {
          if (!microphoneRef.current) {
            clearInterval(interval)
            return
          }
          var animals = ["Lion", "Elephant", "Rhino", "Leopard", "Cheetah", "African Wild Dog", "Mountain Gorilla", "Birds"]
          var randomAnimal = animals[Math.floor(Math.random() * animals.length)]
          setCurrentDetection({
            animal: randomAnimal,
            confidence: Math.floor(Math.random() * 20) + 75,
            type: "safe"
          })
        }, 5000)
      })
      .catch(function(error) {
        alert("Microphone access denied")
      })
  }

  function handleStopMonitoring() {
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(function(track) {
        track.stop()
      })
      microphoneRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    setIsMonitoring(false)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#D3D3D3,#000000)", 
      color: "white",
      padding: "20px"
    }}>
      <h1 style={{ color: "#15803d", textAlign: "center" }}>Wildlife Dashboard</h1>
      <h1 style={{ color: "#b45309", textAlign: "center" }}>AI-Powered Conservation Monitoring</h1>
      
      <button style={{ 
        marginTop: "70px",
        backgroundColor: "#1e40af", 
        color: "white", 
        fontSize: "18px",
        padding: "15px 30px", 
        borderRadius: "8px",
        border: "none",
        cursor: "pointer"
      }} 
        onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
      >
        {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
      </button>

      {isMonitoring && (
        <h2 style={{ color: "#4ade80", marginTop: "15px" }}>Listening for sounds...</h2>
      )}

      <div style={{
        display: "flex",
        gap: "20px",
        marginTop: "50px"
      }}>
        <div style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "20px",
          borderRadius: "10px",
          flex: 1
        }}>
          <h3>Current Detection</h3>
          
          {isAnalyzing ? (
            <p style={{ color: "#3b82f6" }}>Analyzing audio...</p>
          ) : currentDetection ? (
            <div>
              <img 
                src={wildlifeData[currentDetection.animal].image} 
                alt={currentDetection.animal}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  borderRadius: "10px",
                  marginBottom: "10px"
                }}
              />
              <p style={{ fontSize: "20px", fontWeight: "bold" }}>{currentDetection.animal}</p>
              <p style={{ color: "#888" }}>Confidence: {currentDetection.confidence}%</p>
            </div>
          ) : (
            <p style={{ color: "#888" }}>No sounds detected yet</p>
          )}
          
          <label style={{
            display: "inline-block",
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#1e40af",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            Upload Audio
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileUpload} 
              style={{ display: "none" }} 
            />
          </label>
        </div>

        <div style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "20px",
          borderRadius: "10px",
          flex: 1
        }}>
          <h3>Location</h3>
          {location ? (
            <p>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
          ) : (
            <p style={{ color: "#888" }}>No location set</p>
          )}
          <button onClick={handleGetLocation} style={{
            display: "inline-block",
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#1e40af",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer"
          }}>
            Get My Location
          </button>
        </div>
      </div>

    </div>
  )
}

export default App


