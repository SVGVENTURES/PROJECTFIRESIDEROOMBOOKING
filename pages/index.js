import React, { useState, useEffect, useRef } from 'react';

const RoomBookingSystem = () => {
  const ROOMS = ["UR1", "UR2", "Prithvi", "Tejas", "Akash"];
  const OFFICE_HOURS = { start: 9, end: 22 };

  // ============= STATE =============
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedStartTime, setSelectedStartTime] = useState("09:00");
  const [selectedEndTime, setSelectedEndTime] = useState("09:30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ============= HELPER FUNCTIONS =============
  function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function formatDateString(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
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

  function isRoomAvailable(room, date) {
    return !bookings.some(booking => booking.room === room && booking.date === date);
  }

  function isTimeSlotBooked(time) {
    const timeMinutes = timeToMinutes(time);
    return bookings.some(booking => {
      if (booking.room !== selectedRoom || booking.date !== selectedDate) return false;
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      return timeMinutes >= bookingStart && timeMinutes < bookingEnd;
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

  // ============= HANDLERS =============
  function handleSetUserName() {
    if (userNameInput.trim()) {
      const name = userNameInput.trim();
      setUserName(name);
      setUserNameInput("");
    }
  }

  function handleBookRoom() {
    setError("");
    setSuccessMessage("");

    if (!userName) {
      setError("Please enter your name first");
      return;
    }

    const startMin = timeToMinutes(selectedStartTime);
    const endMin = timeToMinutes(selectedEndTime);

    if (startMin >= endMin) {
      setError("End time must be after start time");
      return;
    }

    if (new Date(selectedDate) < new Date(getTodayDateString())) {
      setError("Cannot book rooms in the past");
      return;
    }

    const conflictMsg = getConflictMessage(selectedRoom, selectedDate, selectedStartTime, selectedEndTime);
    if (conflictMsg) {
      setError(`Booking conflict: ${conflictMsg}`);
      return;
    }

    setLoading(true);

    const newBooking = {
      id: generateId(),
      room: selectedRoom,
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      bookedBy: userName,
      createdAt: new Date().toISOString()
    };

    setBookings([...bookings, newBooking].sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.startTime}`);
      const bTime = new Date(`${b.date}T${b.startTime}`);
      return aTime - bTime;
    }));

    setSuccessMessage(`Successfully booked ${selectedRoom} on ${selectedDate} from ${selectedStartTime} to ${selectedEndTime}`);
    setSelectedStartTime("09:00");
    setSelectedEndTime("09:30");
    setLoading(false);

    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function handleCancelBooking(booking) {
    if (booking.bookedBy !== userName) {
      setError("You can only cancel your own bookings");
      return;
    }

    if (!confirm(`Are you sure you want to cancel ${booking.room} booking on ${formatDateString(booking.date)}?`)) {
      return;
    }

    setBookings(bookings.filter(b => b.id !== booking.id));
  }

  function handleLogout() {
    setUserName("");
    setUserNameInput("");
  }

  // ============= RENDER: LOGIN SCREEN =============
  if (!userName) {
    return (
      <div style={styles.container}>
        <div style={styles.setupCard}>
          <h1 style={styles.brandTitle}>FIRESIDE</h1>
          <p style={styles.brandSubtitle}>Ventures</p>
          <h2 style={styles.setupTitle}>Room Booking System</h2>
          <p style={styles.setupDescription}>Access our premium meeting rooms and book your space with ease.</p>
          <input
            type="text"
            placeholder="Full Name"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSetUserName()}
            style={styles.input}
            autoFocus
            maxLength="50"
          />
          <button onClick={handleSetUserName} disabled={!userNameInput.trim()} style={{...styles.primaryButton, opacity: !userNameInput.trim() ? 0.5 : 1, cursor: !userNameInput.trim() ? "not-allowed" : "pointer"}}>Get Started</button>
          {!userNameInput.trim() && <p style={{color: "#8B0000", fontSize: "12px", marginTop: "12px"}}>Please enter your full name to continue</p>}
        </div>
      </div>
    );
  }

  // ============= RENDER: MAIN APP =============
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brandSection}>
            <h1 style={styles.brandTitle}>FIRESIDE</h1>
            <p style={styles.brandSubtext}>Meeting Rooms</p>
          </div>
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userBadge}>{userName}</div>
          <button onClick={handleLogout} style={styles.logoutButton}>Switch</button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* ===== BOOKING FORM ===== */}
        <div style={styles.bookingPanel}>
          <h2 style={styles.sectionTitle}>Reserve Your Space</h2>

          {error && (
            <div style={styles.errorMessage} role="alert">
              <span style={styles.errorIcon}>⚠</span> {error}
            </div>
          )}
          {successMessage && (
            <div style={styles.successMessage} role="alert">
              <span style={styles.successIcon}>✓</span> {successMessage}
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
                    ...(selectedRoom === room ? styles.roomButtonActive : {}),
                    ...(!isRoomAvailable(room, selectedDate) ? styles.roomButtonUnavailable : styles.roomButtonInactive)
                  }}
                >
                  {room}
                </button>
              ))}
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
              <select value={selectedStartTime} onChange={(e) => setSelectedStartTime(e.target.value)} style={styles.select}>
                {getTimeSlots().map((slot) => (
                  <option key={slot} value={slot} disabled={isTimeSlotBooked(slot)}>{slot}{isTimeSlotBooked(slot) ? " (Booked)" : ""}</option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>End Time</label>
              <select value={selectedEndTime} onChange={(e) => setSelectedEndTime(e.target.value)} style={styles.select}>
                {getTimeSlots().filter(slot => timeToMinutes(slot) > timeToMinutes(selectedStartTime)).map((slot) => (
                  <option key={slot} value={slot} disabled={isTimeSlotBooked(slot)}>{slot}{isTimeSlotBooked(slot) ? " (Booked)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration Display */}
          <div style={styles.durationInfo}>
            <span style={styles.durationLabel}>Duration</span>
            <span style={styles.durationValue}>{(timeToMinutes(selectedEndTime) - timeToMinutes(selectedStartTime)) / 60} hour(s)</span>
          </div>

          {/* Book Button */}
          <button
            onClick={handleBookRoom}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </div>

        {/* ===== BOOKINGS LIST ===== */}
        <div style={styles.bookingsPanel}>
          <h2 style={styles.sectionTitle}>
            All Bookings <span style={styles.badgeCount}>{bookings.length}</span>
          </h2>

          {bookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>No reservations yet</p>
              <p style={styles.emptyStateHint}>Book a room to see it here</p>
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
                      ...(isUpcoming ? styles.bookingItemUpcoming : styles.bookingItemPast)
                    }}
                  >
                    <div style={styles.bookingDetails}>
                      <div style={styles.bookingRoom}>{booking.room}</div>
                      <div style={styles.bookingTime}>
                        {formatDateString(booking.date)} • {booking.startTime} – {booking.endTime}
                      </div>
                      <div style={styles.bookingBy}>
                        Booked by <strong>{booking.bookedBy}</strong>
                      </div>
                    </div>
                    {isUserBooking && isUpcoming && (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        disabled={loading}
                        style={styles.cancelButton}
                        title="Cancel this booking"
                      >
                        ✕
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
    backgroundColor: "#f5f1f1",
    color: "#2c2c2c",
    fontFamily: "'Poppins', sans-serif",
    padding: "12px",
    width: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(139, 0, 0, 0.08)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
  },
  brandSection: {
    borderRight: "2px solid #8B0000",
    paddingRight: "30px",
  },
  brandTitle: {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
    color: "#8B0000",
    letterSpacing: "2px",
  },
  brandSubtext: {
    fontSize: "12px",
    color: "#999",
    marginTop: "4px",
    margin: 0,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userBadge: {
    padding: "10px 20px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    borderRadius: "25px",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    color: "#8B0000",
    border: "2px solid #8B0000",
    borderRadius: "25px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    overflow: "hidden",
  },
  bookingPanel: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "20px",
    boxShadow: "0 2px 12px rgba(139, 0, 0, 0.08)",
  },
  bookingsPanel: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "20px",
    boxShadow: "0 2px 12px rgba(139, 0, 0, 0.08)",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "16px",
    margin: 0,
    color: "#2c2c2c",
    letterSpacing: "0.5px",
  },
  badgeCount: {
    backgroundColor: "#8B0000",
    color: "white",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "13px",
    marginLeft: "8px",
  },
  formSection: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#8B0000",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    backgroundColor: "#f9f9f9",
    color: "#2c2c2c",
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.3s ease",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    backgroundColor: "#f9f9f9",
    color: "#2c2c2c",
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
    fontSize: "14px",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  timeRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  roomButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
  },
  roomButton: {
    padding: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    backgroundColor: "white",
  },
  roomButtonActive: {
    backgroundColor: "#8B0000",
    color: "#FFF",
    borderColor: "#8B0000",
  },
  roomButtonInactive: {
    backgroundColor: "white",
    color: "#666",
    borderColor: "#e0e0e0",
  },
  roomButtonUnavailable: {
    backgroundColor: "#4a4a4a",
    color: "#666",
    borderColor: "#4a4a4a",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  durationInfo: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "#f9f9f9",
    borderRadius: "14px",
  },
  durationLabel: {
    fontWeight: "600",
    color: "#8B0000",
  },
  durationValue: {
    fontWeight: "700",
    color: "#2c2c2c",
  },
  primaryButton: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    letterSpacing: "0.5px",
  },
  cancelButton: {
    padding: "8px 12px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "400",
    transition: "background-color 0.3s ease",
  },
  errorMessage: {
    backgroundColor: "#fff5f5",
    color: "#8B0000",
    padding: "14px",
    borderRadius: "14px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid #ffcccb",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  errorIcon: {
    fontSize: "18px",
  },
  successMessage: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "14px",
    borderRadius: "14px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  successIcon: {
    fontSize: "18px",
  },
  bookingsList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxHeight: "calc(100vh - 400px)",
    overflowY: "auto",
  },
  bookingItem: {
    padding: "18px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "2px solid #8B0000",
    transition: "all 0.3s ease",
    backgroundColor: "#fafafa",
  },
  bookingItemUpcoming: {
    backgroundColor: "#ffffff",
    borderColor: "#8B0000",
  },
  bookingItemPast: {
    backgroundColor: "#f9f9f9",
    opacity: 0.7,
    borderColor: "#ddd",
  },
  bookingDetails: {
    flex: 1,
  },
  bookingRoom: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#8B0000",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  bookingTime: {
    fontSize: "14px",
    color: "#2c2c2c",
    marginBottom: "8px",
    fontWeight: "600",
  },
  bookingBy: {
    fontSize: "13px",
    color: "#666",
    fontWeight: "600",
  },
  emptyState: {
    textAlign: "center",
    color: "#999",
    padding: "50px 20px",
  },
  emptyStateTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#666",
    marginBottom: "8px",
  },
  emptyStateHint: {
    fontSize: "13px",
    marginTop: "8px",
  },
  setupCard: {
    maxWidth: "450px",
    margin: "100px auto",
    backgroundColor: "white",
    padding: "50px",
    borderRadius: "20px",
    boxShadow: "0 4px 20px rgba(139, 0, 0, 0.12)",
    textAlign: "center",
  },
  setupTitle: {
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "16px",
    color: "#2c2c2c",
  },
  setupDescription: {
    fontSize: "15px",
    color: "#666",
    marginBottom: "30px",
    lineHeight: "1.6",
  },
  brandSubtitle: {
    fontSize: "18px",
    color: "#9CA3AF",
    marginTop: "4px",
  },
};

export default RoomBookingSystem;
