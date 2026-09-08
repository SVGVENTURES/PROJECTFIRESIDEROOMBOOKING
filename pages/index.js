import React, { useState, useEffect, useRef } from 'react';

const RoomBookingSystem = () => {
  const ROOMS = ["UR1", "UR2", "Prithvi", "Tejas", "Akash"];
  const OFFICE_HOURS = { start: 9, end: 22 };

  // ============= STATE =============
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSlots, setSelectedSlots] = useState({}); // {roomName: [slotIndices]}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [viewMode, setViewMode] = useState("booking"); // "booking" or "viewBookings"

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

  function formatTimeRange(startSlotIndex, slotCount) {
    const slots = getTimeSlots();
    const startTime = slots[startSlotIndex];
    const endSlotIndex = startSlotIndex + slotCount;
    const endTime = endSlotIndex < slots.length ? slots[endSlotIndex] : slots[slots.length - 1];
    return { startTime, endTime };
  }

  function isSlotBooked(room, date, slotIndex) {
    const slots = getTimeSlots();
    const slotTime = slots[slotIndex];
    
    return bookings.some(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      
      const bookingStartIndex = slots.indexOf(booking.startTime);
      const bookingEndIndex = slots.indexOf(booking.endTime);
      
      return slotIndex >= bookingStartIndex && slotIndex < bookingEndIndex;
    });
  }

  function generateId() {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function getConsecutiveSlots(room, selectedSlotIndices) {
    const sorted = [...selectedSlotIndices].sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return null; // Not consecutive
      }
    }
    return sorted;
  }

  function changeDate(days) {
    const currentDate = new Date(selectedDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + days);
    const newDateString = currentDate.toISOString().split('T')[0];
    
    if (new Date(newDateString) >= new Date(getTodayDateString())) {
      setSelectedDate(newDateString);
      setSelectedSlots({}); // Reset selections on date change
      setError("");
      setSuccessMessage("");
    }
  }

  // ============= HANDLERS =============
  function handleSetUserName() {
    if (userNameInput.trim()) {
      const name = userNameInput.trim();
      setUserName(name);
      setUserNameInput("");
    }
  }

  function handleSlotClick(room, slotIndex) {
    setSelectedSlots(prev => {
      const updatedSlots = { ...prev };
      if (!updatedSlots[room]) {
        updatedSlots[room] = [];
      }

      const index = updatedSlots[room].indexOf(slotIndex);
      if (index > -1) {
        updatedSlots[room].splice(index, 1);
      } else {
        updatedSlots[room].push(slotIndex);
      }

      if (updatedSlots[room].length === 0) {
        delete updatedSlots[room];
      }

      return updatedSlots;
    });
  }

  function handleBookRoom() {
    setError("");
    setSuccessMessage("");

    if (!userName) {
      setError("Please enter your name first");
      return;
    }

    const roomsWithSlots = Object.keys(selectedSlots).filter(room => selectedSlots[room].length > 0);
    if (roomsWithSlots.length === 0) {
      setError("Please select at least one time slot");
      return;
    }

    const newBookings = [];

    for (const room of roomsWithSlots) {
      const slotIndices = getConsecutiveSlots(room, selectedSlots[room]);
      
      if (!slotIndices) {
        setError(`${room}: Please select consecutive time slots only`);
        return;
      }

      const { startTime, endTime } = formatTimeRange(slotIndices[0], slotIndices.length);

      const hasConflict = bookings.some(booking => {
        if (booking.room !== room || booking.date !== selectedDate) return false;
        const slots = getTimeSlots();
        const bookingStartIndex = slots.indexOf(booking.startTime);
        const bookingEndIndex = slots.indexOf(booking.endTime);
        const newStartIndex = slots.indexOf(startTime);
        const newEndIndex = slots.indexOf(endTime);
        
        return !(newEndIndex <= bookingStartIndex || newStartIndex >= bookingEndIndex);
      });

      if (hasConflict) {
        const conflictBooking = bookings.find(b => 
          b.room === room && b.date === selectedDate &&
          slotIndices.some(idx => isSlotBooked(room, selectedDate, idx))
        );
        setError(`${room} is already booked during this time by ${conflictBooking.bookedBy}`);
        return;
      }

      newBookings.push({
        id: generateId(),
        room: room,
        date: selectedDate,
        startTime: startTime,
        endTime: endTime,
        bookedBy: userName,
        createdAt: new Date().toISOString()
      });
    }

    setLoading(true);

    setBookings([...bookings, ...newBookings].sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.startTime}`);
      const bTime = new Date(`${b.date}T${b.startTime}`);
      return aTime - bTime;
    }));

    setSuccessMessage(`Successfully booked ${roomsWithSlots.join(", ")}!`);
    setSelectedSlots({});
    setLoading(false);

    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function handleCancelBooking(booking) {
    if (booking.bookedBy !== userName) {
      setError("You can only cancel your own bookings");
      return;
    }

    if (!confirm(`Are you sure you want to cancel ${booking.room} booking on ${formatDateString(booking.date)} from ${booking.startTime} to ${booking.endTime}?`)) {
      return;
    }

    setBookings(bookings.filter(b => b.id !== booking.id));
    setSuccessMessage(`Booking cancelled successfully`);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function handleLogout() {
    setUserName("");
    setUserNameInput("");
    setViewMode("booking");
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
          {!userNameInput.trim() && <p style={{color: "#8B0000", fontSize: "12px", marginTop: "12px"}}>Please enter your name</p>}
        </div>
      </div>
    );
  }

  // ============= RENDER: BOOKING VIEW =============
  if (viewMode === "booking") {
    const timeSlots = getTimeSlots();

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
            <button 
              onClick={() => setViewMode("viewBookings")} 
              style={styles.viewBookingsButton}
              title="View all bookings"
            >
              View Bookings
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>Switch</button>
          </div>
        </div>

        <div style={styles.bookingContainer}>
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

          {/* Date Navigation */}
          <div style={styles.dateNavigation}>
            <button 
              onClick={() => changeDate(-1)}
              style={styles.dateButton}
            >
              ← Previous
            </button>
            <h2 style={styles.dateDisplay}>{formatDateString(selectedDate)}</h2>
            <button 
              onClick={() => changeDate(1)}
              style={styles.dateButton}
            >
              Next →
            </button>
          </div>

          {/* Time Slots Grid */}
          <div style={styles.gridContainer}>
            {/* Header Row - Room Names */}
            <div style={styles.gridHeader}>
              <div style={styles.timeColumnHeader}>Time</div>
              {ROOMS.map(room => (
                <div key={room} style={styles.roomColumnHeader}>
                  {room}
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            {timeSlots.map((slot, index) => {
              return (
                <div key={slot} style={styles.gridRow}>
                  <div style={styles.timeCell}>{slot}</div>
                  {ROOMS.map(room => {
                    const isSelected = selectedSlots[room] && selectedSlots[room].includes(index);
                    const isBooked = isSlotBooked(room, selectedDate, index);
                    
                    return (
                      <div
                        key={`${room}-${slot}`}
                        onClick={() => !isBooked && handleSlotClick(room, index)}
                        style={{
                          ...styles.slotCell,
                          ...(isBooked ? styles.slotBooked : {}),
                          ...(isSelected ? styles.slotSelected : {}),
                          ...(isBooked ? {} : styles.slotClickable)
                        }}
                        title={isBooked ? "This slot is booked" : "Click to select"}
                      >
                        {isSelected && <span style={styles.checkmark}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Book Button */}
          <div style={styles.bookButtonContainer}>
            <button
              onClick={handleBookRoom}
              disabled={loading || Object.keys(selectedSlots).length === 0}
              style={{
                ...styles.primaryButton,
                opacity: (loading || Object.keys(selectedSlots).length === 0) ? 0.6 : 1,
                cursor: (loading || Object.keys(selectedSlots).length === 0) ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Booking..." : `Confirm Booking (${Object.values(selectedSlots).reduce((sum, arr) => sum + arr.length, 0)} slots selected)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============= RENDER: VIEW BOOKINGS =============
  if (viewMode === "viewBookings") {
    const userBookings = bookings.filter(b => b.bookedBy === userName);
    const allBookings = bookings;

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
            <button 
              onClick={() => { setViewMode("booking"); setError(""); setSuccessMessage(""); }}
              style={styles.viewBookingsButton}
            >
              Back to Booking
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>Switch</button>
          </div>
        </div>

        <div style={styles.bookingsViewContainer}>
          {successMessage && (
            <div style={styles.successMessage} role="alert">
              <span style={styles.successIcon}>✓</span> {successMessage}
            </div>
          )}
          {error && (
            <div style={styles.errorMessage} role="alert">
              <span style={styles.errorIcon}>⚠</span> {error}
            </div>
          )}

          <div style={styles.bookingsTabs}>
            <h2 style={styles.bookingsTitle}>Your Bookings <span style={styles.badgeCount}>{userBookings.length}</span></h2>
          </div>

          {userBookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>No bookings yet</p>
              <p style={styles.emptyStateHint}>Go back to booking to create your first reservation</p>
            </div>
          ) : (
            <div style={styles.bookingsList}>
              {userBookings.map((booking) => {
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
                    {isUpcoming && (
                      <button
                        onClick={() => { handleCancelBooking(booking); }}
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

          <div style={styles.bookingsTabs}>
            <h2 style={styles.bookingsTitle}>All Bookings <span style={styles.badgeCount}>{allBookings.length}</span></h2>
          </div>

          {allBookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>No reservations yet</p>
              <p style={styles.emptyStateHint}>Be the first to book a room</p>
            </div>
          ) : (
            <div style={styles.bookingsList}>
              {allBookings.map((booking) => {
                const bookingDate = new Date(booking.date);
                const today = new Date(getTodayDateString());
                const isUpcoming = bookingDate >= today;
                const isUserBooking = booking.bookedBy === userName;

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
                        onClick={() => { handleCancelBooking(booking); }}
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
    );
  }
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
    overflow: "auto",
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
  viewBookingsButton: {
    padding: "10px 20px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "2px solid #8B0000",
    borderRadius: "25px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
  bookingContainer: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 2px 12px rgba(139, 0, 0, 0.08)",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  dateNavigation: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "30px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },
  dateDisplay: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#8B0000",
    margin: 0,
    minWidth: "200px",
    textAlign: "center",
  },
  dateButton: {
    padding: "10px 20px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
  gridContainer: {
    overflowX: "auto",
    marginBottom: "30px",
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
  },
  gridHeader: {
    display: "grid",
    gridTemplateColumns: `100px repeat(5, 1fr)`,
    gap: "0",
    backgroundColor: "#8B0000",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  timeColumnHeader: {
    padding: "15px",
    color: "#FFF",
    fontWeight: "700",
    fontSize: "13px",
    textAlign: "center",
    borderRight: "1px solid rgba(255,255,255,0.2)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  roomColumnHeader: {
    padding: "15px",
    color: "#FFF",
    fontWeight: "700",
    fontSize: "14px",
    textAlign: "center",
    borderRight: "1px solid rgba(255,255,255,0.2)",
  },
  gridRow: {
    display: "grid",
    gridTemplateColumns: `100px repeat(5, 1fr)`,
    gap: "0",
    borderBottom: "1px solid #e0e0e0",
  },
  timeCell: {
    padding: "12px 15px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#8B0000",
    backgroundColor: "#f9f9f9",
    borderRight: "1px solid #e0e0e0",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  slotCell: {
    padding: "15px",
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #e0e0e0",
    position: "relative",
    backgroundColor: "#ffffff",
  },
  slotClickable: {
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  slotSelected: {
    backgroundColor: "#8B0000",
    color: "#FFF",
    fontWeight: "700",
  },
  slotBooked: {
    backgroundColor: "#d0d0d0",
    color: "#666",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  checkmark: {
    fontSize: "20px",
    fontWeight: "700",
  },
  bookButtonContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "20px",
  },
  primaryButton: {
    padding: "14px 40px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    letterSpacing: "0.5px",
    minWidth: "300px",
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
  bookingsViewContainer: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 2px 12px rgba(139, 0, 0, 0.08)",
    maxWidth: "900px",
    margin: "0 auto",
  },
  bookingsTabs: {
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "2px solid #e0e0e0",
  },
  bookingsTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
    color: "#2c2c2c",
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  badgeCount: {
    backgroundColor: "#8B0000",
    color: "white",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "13px",
  },
  bookingsList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginBottom: "30px",
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
