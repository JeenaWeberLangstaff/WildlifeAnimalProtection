import { useState, useRef } from 'react'
import './App.css'

function App() {
  var [isMonitoring, setIsMonitoring] = useState(false)
  var [location, setLocation] = useState(null)
  var [audioFile, setAudioFile] = useState(null)
  var [currentDetection, setCurrentDetection] = useState(null)
  var [isAnalyzing, setIsAnalyzing] = useState(false)
  var [detectionHistory, setDetectionHistory] = useState([])
  var [speciesCount, setSpeciesCount] = useState({})
  var [sessionStart, setSessionStart] = useState(null)
  var [sessionDuration, setSessionDuration] = useState(0)
  var [isDarkMode, setIsDarkMode] = useState(true)
  var [detectionKey, setDetectionKey] = useState(0)
  var microphoneRef = useRef(null)
  var audioContextRef = useRef(null)
  var timerRef = useRef(null)

  var wildlifeData = {
    "Lion": { image: "https://source.unsplash.com/400x300/?lion,wildlife" },
    "Elephant": { image: "https://source.unsplash.com/400x300/?elephant,wildlife" },
    "Rhino": { image: "https://source.unsplash.com/400x300/?rhinoceros,wildlife" },
    "Leopard": { image: "https://source.unsplash.com/400x300/?leopard,wildlife" },
    "Cheetah": { image: "https://source.unsplash.com/400x300/?cheetah,wildlife" },
    "African Wild Dog": { image: "https://source.unsplash.com/400x300/?african+wild+dog,wildlife" },
    "Mountain Gorilla": { image: "https://source.unsplash.com/400x300/?gorilla,wildlife" },
    "Birds": { image: "https://source.unsplash.com/400x300/?african+birds,wildlife" }
  }

  var highRiskAnimals = ["Rhino", "Cheetah", "African Wild Dog"]

  var theme = {
    bg: isDarkMode ? "linear-gradient(180deg,#1a1a1a,#000000)" : "linear-gradient(180deg,#f0f0f0,#ffffff)",
    color: isDarkMode ? "white" : "#111111",
    panelBg: isDarkMode ? "rgba(0,0,0,0.6)" : "rgba(200,200,200,0.4)",
    subText: isDarkMode ? "#888" : "#555"
  }

  function playAlertSound() {
    var ctx = new AudioContext()
    var oscillator = ctx.createOscillator()
    var gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = "square"
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  }

  function formatDuration(seconds) {
    var mins = Math.floor(seconds / 60)
    var secs = seconds % 60
    return mins + "m " + secs + "s"
  }

  function handleExportCSV() {
    var rows = ["Animal,Alert,Confidence,Timestamp"]
    detectionHistory.forEach(function(item) {
      rows.push(item.animal + "," + item.alert + "," + item.confidence + "%," + item.timestamp)
    })
    var csvContent = rows.join("\n")
    var blob = new Blob([csvContent], { type: "text/csv" })
    var url = URL.createObjectURL(blob)
    var a = document.createElement("a")
    a.href = url
    a.download = "detection_history.csv"
    a.click()
    URL.revokeObjectURL(url)
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
        var newDetection = {
          animal: randomAnimal,
          confidence: Math.floor(Math.random() * 20) + 75,
          timestamp: new Date().toLocaleTimeString(),
          alert: highRiskAnimals.includes(randomAnimal) ? "HIGH RISK" : "SAFE"
        }
        setCurrentDetection(newDetection)
        setDetectionKey(function(prev) { return prev + 1 })
        setDetectionHistory(function(prev) {
          return [newDetection, ...prev].slice(0, 10)
        })
        setSpeciesCount(function(prev) {
          return { ...prev, [randomAnimal]: (prev[randomAnimal] || 0) + 1 }
        })
        if (newDetection.alert === "HIGH RISK") playAlertSound()
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
        setSessionStart(new Date())
        timerRef.current = setInterval(function() {
          setSessionDuration(function(prev) { return prev + 1 })
        }, 1000)
        var interval = setInterval(function() {
          if (!microphoneRef.current) {
            clearInterval(interval)
            return
          }
          var animals = ["Lion", "Elephant", "Rhino", "Leopard", "Cheetah", "African Wild Dog", "Mountain Gorilla", "Birds"]
          var randomAnimal = animals[Math.floor(Math.random() * animals.length)]
          var newDetection = {
            animal: randomAnimal,
            confidence: Math.floor(Math.random() * 20) + 75,
            timestamp: new Date().toLocaleTimeString(),
            alert: highRiskAnimals.includes(randomAnimal) ? "HIGH RISK" : "SAFE"
          }
          setCurrentDetection(newDetection)
          setDetectionKey(function(prev) { return prev + 1 })
          setDetectionHistory(function(prev) {
            return [newDetection, ...prev].slice(0, 10)
          })
          setSpeciesCount(function(prev) {
            return { ...prev, [randomAnimal]: (prev[randomAnimal] || 0) + 1 }
          })
          if (newDetection.alert === "HIGH RISK") playAlertSound()
        }, 5000)
      })
      .catch(function(error) {
        alert("Microphone access denied")
      })
  }

  function handleStopMonitoring() {
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(function(track) { track.stop() })
      microphoneRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    clearInterval(timerRef.current)
    setSessionDuration(0)
    setSessionStart(null)
    setIsMonitoring(false)
  }

  function handleReset() {
    setDetectionHistory([])
    setSpeciesCount({})
    setCurrentDetection(null)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      color: theme.color,
      padding: "20px"
    }}>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        <button onClick={function() { setIsDarkMode(function(prev) { return !prev }) }} style={{
          padding: "8px 16px",
          backgroundColor: isDarkMode ? "#f0f0f0" : "#111",
          color: isDarkMode ? "#111" : "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px"
        }}>
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <h1 style={{ color: "#15803d", textAlign: "center" }}>Wildlife Dashboard</h1>
      <h1 style={{ color: "#b45309", textAlign: "center" }}>AI-Powered Conservation Monitoring</h1>

      {sessionStart && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <div style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            border: "1px solid #4ade80",
            borderRadius: "8px",
            padding: "10px 20px",
            display: "inline-flex",
            gap: "40px"
          }}>
            <div>
              <p style={{ margin: 0, color: "#888", fontSize: "12px" }}>Session Started</p>
              <p style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: "bold" }}>
                {sessionStart.toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: "#888", fontSize: "12px" }}>Duration</p>
              <p style={{ margin: 0, color: "#4ade80", fontSize: "16px", fontWeight: "bold" }}>
                {formatDuration(sessionDuration)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "center",
        marginTop: "30px"
      }}>
        {Object.keys(speciesCount).map(function(animal, index) {
          return (
            <div key={index} style={{
              backgroundColor: highRiskAnimals.includes(animal) ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.3)",
              border: highRiskAnimals.includes(animal) ? "1px solid #ef4444" : "1px solid #4ade80",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              textAlign: "center"
            }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>{animal}</p>
              <p style={{ margin: 0 }}>{speciesCount[animal]} detected</p>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <button style={{
          marginTop: "30px",
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

        <div style={{
          marginTop: "20px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <div style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "10px 24px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>Total Detections</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "white" }}>
              {detectionHistory.length}
            </p>
          </div>

          <div style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "10px 24px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>High Risk Alerts</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#ef4444" }}>
              {detectionHistory.filter(function(d) { return d.alert === "HIGH RISK" }).length}
            </p>
          </div>

          <button onClick={handleReset} style={{
            padding: "10px 24px",
            backgroundColor: "#7f1d1d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer"
          }}>
            Reset Dashboard
          </button>

          <button onClick={handleExportCSV} style={{
            padding: "10px 24px",
            backgroundColor: "#166534",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer"
          }}>
            Export CSV
          </button>
        </div>

        {isMonitoring && (
          <div>
            <h2 style={{ color: "#4ade80", marginTop: "15px" }}>Listening for sounds...</h2>
            <div className="waveform">
              {[1,2,3,4,5,6,7,8,9,10].map(function(i) {
                return <div key={i} className="waveform-bar" />
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "50px", flexWrap: "wrap" }}>

        <div key={detectionKey} className="fade-in" style={{
          backgroundColor: currentDetection
            ? currentDetection.alert === "HIGH RISK"
              ? "rgba(239,68,68,0.2)"
              : "rgba(74,222,128,0.2)"
            : theme.panelBg,
          border: currentDetection
            ? currentDetection.alert === "HIGH RISK"
              ? "1px solid #ef4444"
              : "1px solid #4ade80"
            : "none",
          padding: "20px",
          borderRadius: "10px",
          flex: 1,
          minWidth: "250px"
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
              <p style={{
                color: currentDetection.alert === "HIGH RISK" ? "#ef4444" : "#4ade80",
                fontWeight: "bold",
                fontSize: "18px"
              }}>
                {currentDetection.alert}
              </p>
              <p style={{ color: theme.subText }}>Confidence: {currentDetection.confidence}%</p>
            </div>
          ) : (
            <p style={{ color: theme.subText }}>No sounds detected yet</p>
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
          backgroundColor: theme.panelBg,
          padding: "20px",
          borderRadius: "10px",
          flex: 1,
          minWidth: "250px"
        }}>
          <h3>Location</h3>
          {location ? (
            <div>
              <p>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
              <iframe
                src={"https://www.openstreetmap.org/export/embed.html?bbox=" + (location.lng - 0.05) + "," + (location.lat - 0.05) + "," + (location.lng + 0.05) + "," + (location.lat + 0.05) + "&layer=mapnik&marker=" + location.lat + "," + location.lng}
                style={{
                  width: "100%",
                  height: "200px",
                  borderRadius: "10px",
                  marginTop: "10px",
                  border: "none"
                }}
              />
            </div>
          ) : (
            <p style={{ color: theme.subText }}>No location set</p>
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

        <div style={{
          backgroundColor: theme.panelBg,
          padding: "20px",
          borderRadius: "10px",
          flex: 1,
          minWidth: "250px"
        }}>
          <h3>Detection History</h3>
          {detectionHistory.length === 0 ? (
            <p style={{ color: theme.subText }}>No detections yet</p>
          ) : (
            detectionHistory.map(function(item, index) {
              return (
                <div key={index} className="fade-in" style={{
                  borderBottom: "1px solid #333",
                  padding: "8px 0",
                  fontSize: "14px"
                }}>
                  <p style={{
                    margin: 0,
                    fontWeight: "bold",
                    color: item.alert === "HIGH RISK" ? "#ef4444" : "#4ade80"
                  }}>
                    {item.animal} — {item.alert}
                  </p>
                  <p style={{ margin: 0, color: theme.subText }}>{item.confidence}% — {item.timestamp}</p>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}

export default App


