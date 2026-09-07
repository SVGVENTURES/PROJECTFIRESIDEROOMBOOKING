import React, { useState, useEffect, useRef } from 'react';

const RoomBookingSystem = () => {
  // ============= FIREBASE CONFIG =============
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB0AcXlHlrru2qgyBTDqHmCjGm9GU4wcuw",
    projectId: "fireside-project-room",
    databaseURL: "https://fireside-project-room-default-rtdb.firebaseio.com"
  };

  const ROOMS = ["Prithvi", "Akash", "Tejas"];
  const OFFICE_HOURS = { start: 8, end: 18 };

  // ============= STATE =============
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedStartTime, setSelectedStartTime] = useState("09:00");
  const [selectedEndTime, setSelectedEndTime] = useState("10:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const eventSourceRef = useRef(null);

  // ============= INIT & LISTENERS =============
  useEffect(() => {
    const stored = localStorage.getItem("roomBookingUserName");
    if (stored) setUserName(stored);
  }, []);

  useEffect(() => {
    if (!userName) return;

    setLoading(true);
    const unsubscribe = setupRealtimeListener((data) => {
      const bookingsArray = data
        ? Object.entries(data).map(([id, booking]) => ({ id, ...booking }))
        : [];
      setBookings(bookingsArray.sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.startTime}`);
        const bTime = new Date(`${b.date}T${b.startTime}`);
        return aTime - bTime;
      }));
      setFirebaseConnected(true);
      setLoading(false);
    });

    return unsubscribe;
  }, [userName]);

  // ============= HELPER FUNCTIONS =============
  function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function getTimeSlots() {
    const slots = [];
    for (let hour = OFFICE_HOURS.start; hour < OFFICE_HOURS.end; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  }

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function isTimeSlotAvailable(room, date, startTime, endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return !bookings.some(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      return !(endMinutes <= bookingStart || startMinutes >= bookingEnd);
    });
  }

  function getConflictMessage(room, date, startTime, endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const conflicts = bookings.filter(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      return !(endMinutes <= bookingStart || startMinutes >= bookingEnd);
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return `${room} is booked from ${conflict.startTime} to ${conflict.endTime} by ${conflict.bookedBy}`;
    }
    return null;
  }

  function generateId() {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============= FIREBASE OPERATIONS =============
  async function createBooking(bookingData) {
    const bookingId = generateId();
    const url = `${FIREBASE_CONFIG.databaseURL}/bookings/${bookingId}.json`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
      throw new Error(`Firebase error: ${response.statusText}`);
    }

    return bookingId;
  }

  async function deleteBooking(bookingId) {
    const url = `${FIREBASE_CONFIG.databaseURL}/bookings/${bookingId}.json`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Firebase error: ${response.statusText}`);
    }
  }

  function setupRealtimeListener(callback) {
    const url = `${FIREBASE_CONFIG.databaseURL}/bookings.json`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.data !== null) {
          callback(message.data);
        } else {
          callback({});
        }
      } catch (err) {
        console.error('Failed to parse Firebase message:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('Firebase connection error');
      eventSource.close();
      setTimeout(() => setupRealtimeListener(callback), 3000);
    };

    eventSourceRef.current = eventSource;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }

  // ============= HANDLERS =============
  function handleSetUserName() {
    if (userNameInput.trim()) {
      const name = userNameInput.trim();
      setUserName(name);
      localStorage.setItem("roomBookingUserName", name);
      setUserNameInput("");
    }
  }

  async function handleBookRoom() {
    setError("");
    setSuccessMessage("");

    if (!userName) {
      setError("Please enter your name first");
      return;
    }

    if (selectedStartTime >= selectedEndTime) {
      setError("Start time must be before end time");
      return;
    }

    if (new Date(selectedDate) < new Date(getTodayDateString())) {
      setError("Cannot book rooms in the past");
      return;
    }

    const conflictMsg = getConflictMessage(
      selectedRoom,
      selectedDate,
      selectedStartTime,
      selectedEndTime
    );

    if (conflictMsg) {
      setError(`Booking conflict: ${conflictMsg}`);
      return;
    }

    setLoading(true);

    try {
      await createBooking({
        room: selectedRoom,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        bookedBy: userName,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage(
        `Successfully booked ${selectedRoom} on ${selectedDate} from ${selectedStartTime} to ${selectedEndTime}`
      );
      setSelectedStartTime("09:00");
      setSelectedEndTime("10:00");

      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(`Failed to create booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(booking) {
    if (booking.bookedBy !== userName) {
      setError("You can only cancel your own bookings");
      return;
    }

    if (!confirm(`Cancel booking for ${booking.room} on ${booking.date}?`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteBooking(booking.id);
    } catch (err) {
      setError(`Failed to cancel booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setUserName("");
    setUserNameInput("");
    localStorage.removeItem("roomBookingUserName");
  }

  // ============= RENDER: LOGIN SCREEN =============
  if (!userName) {
    return (
      <div style={styles.container}>
        <div style={styles.setupCard}>
          <h1 style={styles.title}>Fireside Ventures</h1>
          <p style={styles.subtitle}>Room Booking System</p>
          <p style={styles.setupDescription}>
            Welcome! Enter your name to access the booking system.
          </p>
          <input
            type="text"
            placeholder="Your name"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSetUserName()}
            style={styles.input}
            autoFocus
            maxLength="50"
          />
          <button onClick={handleSetUserName} style={styles.primaryButton}>
            Continue
          </button>
          <p style={styles.hint}>
            Your name will be saved locally on this device
          </p>
        </div>
      </div>
    );
  }

  // ============= RENDER: MAIN APP =============
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Fireside Ventures - Room Booking</h1>
          <p style={styles.connectionStatus}>
            {firebaseConnected ? "Connected" : "Connecting..."}
          </p>
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userBadge}>{userName}</div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Switch User
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* ===== BOOKING FORM ===== */}
        <div style={styles.bookingPanel}>
          <h2 style={styles.sectionTitle}>Create Booking</h2>

          {error && (
            <div style={styles.errorMessage} role="alert">
              {error}
            </div>
          )}
          {successMessage && (
            <div style={styles.successMessage} role="alert">
              {successMessage}
            </div>
          )}

          {/* Room Selection */}
          <div style={styles.formSection}>
            <label style={styles.label}>Select Room</label>
            <div style={styles.roomButtons}>
              {ROOMS.map((room) => (
                <button
                  key={room}
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    ...styles.roomButton,
                    ...(selectedRoom === room
                      ? styles.roomButtonActive
                      : styles.roomButtonInactive)
                  }}
                >
                  {room}
                </button>
              ))}
            </div>
            <div style={styles.roomInfo}>
              Rooms for 4-8 people • Video conferencing included
            </div>
          </div>

          {/* Date Selection */}
          <div style={styles.formSection}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getTodayDateString()}
              style={styles.input}
            />
          </div>

          {/* Time Selection */}
          <div style={styles.timeRow}>
            <div style={styles.formSection}>
              <label style={styles.label}>Start Time</label>
              <select
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                style={styles.select}
              >
                {getTimeSlots().map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>End Time</label>
              <select
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                style={styles.select}
              >
                {getTimeSlots().map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration Display */}
          <div style={styles.durationInfo}>
            Duration: {(timeToMinutes(selectedEndTime) - timeToMinutes(selectedStartTime)) / 60} hours
          </div>

          {/* Book Button */}
          <button
            onClick={handleBookRoom}
            disabled={loading || !firebaseConnected}
            style={{
              ...styles.primaryButton,
              opacity: loading || !firebaseConnected ? 0.5 : 1,
              cursor: loading || !firebaseConnected ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Booking..." : "Book Room"}
          </button>
        </div>

        {/* ===== BOOKINGS LIST ===== */}
        <div style={styles.bookingsPanel}>
          <h2 style={styles.sectionTitle}>
            All Bookings ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No bookings yet</p>
              <p style={styles.emptyStateHint}>
                Be the first to book a room!
              </p>
            </div>
          ) : (
            <div style={styles.bookingsList}>
              {bookings.map((booking) => {
                const isUserBooking = booking.bookedBy === userName;
                const bookingDate = new Date(booking.date);
                const today = new Date(getTodayDateString());
                const isUpcoming = bookingDate >= today;

                return (
                  <div
                    key={booking.id}
                    style={{
                      ...styles.bookingItem,
                      ...(isUpcoming
                        ? styles.bookingItemUpcoming
                        : styles.bookingItemPast)
                    }}
                  >
                    <div style={styles.bookingDetails}>
                      <div style={styles.bookingRoom}>{booking.room}</div>
                      <div style={styles.bookingTime}>
                        {booking.date} • {booking.startTime} – {booking.endTime}
                      </div>
                      <div style={styles.bookingBy}>
                        by <strong>{booking.bookedBy}</strong>
                      </div>
                    </div>
                    {isUserBooking && isUpcoming && (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        disabled={loading}
                        style={styles.cancelButton}
                        title="Cancel this booking"
                      >
                        X
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============= STYLES =============
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#111827",
    color: "#F3F4F6",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "20px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    margin: 0,
    color: "#F3F4F6",
  },
  subtitle: {
    fontSize: "18px",
    color: "#9CA3AF",
    marginTop: "4px",
  },
  connectionStatus: {
    fontSize: "12px",
    color: "#10B981",
    marginTop: "8px",
    margin: 0,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userBadge: {
    padding: "8px 16px",
    backgroundColor: "#3B82F6",
    color: "#FFF",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#374151",
    color: "#F3F4F6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  bookingPanel: {
    backgroundColor: "#1F2937",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #374151",
  },
  bookingsPanel: {
    backgroundColor: "#1F2937",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #374151",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "20px",
    margin: 0,
    color: "#F3F4F6",
  },
  formSection: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#D1D5DB",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#374151",
    color: "#F3F4F6",
    border: "1px solid #4B5563",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#374151",
    color: "#F3F4F6",
    border: "1px solid #4B5563",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  timeRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  roomButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  roomButton: {
    padding: "12px",
    border: "2px solid #4B5563",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  roomButtonActive: {
    backgroundColor: "#3B82F6",
    color: "#FFF",
    borderColor: "#3B82F6",
  },
  roomButtonInactive: {
    backgroundColor: "transparent",
    color: "#D1D5DB",
  },
  roomInfo: {
    fontSize: "12px",
    color: "#9CA3AF",
    marginTop: "8px",
  },
  durationInfo: {
    fontSize: "12px",
    color: "#9CA3AF",
    marginBottom: "16px",
  },
  primaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#3B82F6",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  cancelButton: {
    padding: "8px 12px",
    backgroundColor: "#EF4444",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "400",
  },
  errorMessage: {
    backgroundColor: "#7F1D1D",
    color: "#FCA5A5",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "14px",
    border: "1px solid #DC2626",
  },
  successMessage: {
    backgroundColor: "#065F46",
    color: "#86EFAC",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "14px",
    border: "1px solid #10B981",
  },
  bookingsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "calc(100vh - 300px)",
    overflowY: "auto",
  },
  bookingItem: {
    padding: "14px",
    borderRadius: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #4B5563",
  },
  bookingItemUpcoming: {
    backgroundColor: "#374151",
  },
  bookingItemPast: {
    backgroundColor: "#2D3748",
    opacity: 0.6,
  },
  bookingDetails: {
    flex: 1,
  },
  bookingRoom: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: "4px",
  },
  bookingTime: {
    fontSize: "13px",
    color: "#D1D5DB",
    marginBottom: "4px",
  },
  bookingBy: {
    fontSize: "12px",
    color: "#9CA3AF",
  },
  emptyState: {
    textAlign: "center",
    color: "#9CA3AF",
    padding: "40px 20px",
  },
  emptyStateHint: {
    fontSize: "12px",
    marginTop: "8px",
  },
  setupCard: {
    maxWidth: "400px",
    margin: "80px auto",
    backgroundColor: "#1F2937",
    padding: "40px",
    borderRadius: "8px",
    border: "1px solid #374151",
    textAlign: "center",
  },
  setupDescription: {
    fontSize: "15px",
    color: "#D1D5DB",
    marginBottom: "24px",
  },
  hint: {
    fontSize: "12px",
    color: "#9CA3AF",
    marginTop: "16px",
    margin: 0,
  },
};

export default RoomBookingSystem;
