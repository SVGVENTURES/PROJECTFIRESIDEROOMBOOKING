import React, { useState, useEffect, useRef } from 'react';

const RoomBookingSystem = () => {
  const ROOMS = ["UR1", "UR2", "Prithvi", "Tejas", "Akash"];
  const OFFICE_HOURS = { start: 10, end: 20 }; // 10 AM to 8 PM
  const ADMIN_PASSWORD = "1234";

  // ============= STATE =============
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSlots, setSelectedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [viewMode, setViewMode] = useState("booking");
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editSlots, setEditSlots] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showScrollPrompt, setShowScrollPrompt] = useState(false);
  const bookButtonRef = useRef(null);

  // Add animations on mount
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(8px);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  useEffect(() => {
    const hasSelectedSlots = Object.keys(selectedSlots).length > 0;
    if (hasSelectedSlots) {
      setShowScrollPrompt(true);
    } else {
      setShowScrollPrompt(false);
    }
  }, [selectedSlots]);

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
    return bookings.some(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      const bookingStartIndex = slots.indexOf(booking.startTime);
      const bookingEndIndex = slots.indexOf(booking.endTime);
      return slotIndex >= bookingStartIndex && slotIndex < bookingEndIndex;
    });
  }

  function isSlotBookedExcept(room, date, slotIndex, exceptBookingId) {
    const slots = getTimeSlots();
    return bookings.some(booking => {
      if (booking.id === exceptBookingId) return false;
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
        return null;
      }
    }
    return sorted;
  }

  function changeDate(days) {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    const newDateString = `${newYear}-${newMonth}-${newDay}`;

    if (newDateString >= getTodayDateString()) {
      setSelectedDate(newDateString);
      setSelectedSlots({});
      setError("");
      setSuccessMessage("");
    }
  }

  function goToToday() {
    setSelectedDate(getTodayDateString());
    setSelectedSlots({});
    setError("");
    setSuccessMessage("");
  }

  function scrollToConfirmButton() {
    if (bookButtonRef.current) {
      bookButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowScrollPrompt(false);
    }
  }

  function handleDateInputChange(newDate) {
    const today = getTodayDateString();
    if (newDate >= today) {
      setSelectedDate(newDate);
      setSelectedSlots({});
      setShowDatePicker(false);
      setError("");
      setSuccessMessage("");
    } else {
      setError("Please select valid date");
    }
  }

  // ============= HANDLERS =============
  function handleSetUserName() {
    if (userNameInput.trim()) {
      const name = userNameInput.trim();
      setUserName(name);
      setUserNameInput("");
      setIsAdmin(false);
    }
  }

  function handleAdminLogin() {
    setError("");
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setUserName("Admin");
      setIsAdmin(true);
      setAdminPasswordInput("");
      setShowAdminLogin(false);
    } else {
      setError("Incorrect password");
      setAdminPasswordInput("");
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

  function handleEditSlotClick(room, slotIndex) {
    setEditSlots(prev => {
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

    setTimeout(() => {
      setBookings([...bookings, ...newBookings].sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.startTime}`);
        const bTime = new Date(`${b.date}T${b.startTime}`);
        return aTime - bTime;
      }));

      setSuccessMessage(`Successfully booked ${roomsWithSlots.join(", ")}!`);
      setSelectedSlots({});
      setLoading(false);

      setTimeout(() => {
        setViewMode("viewBookings");
        setSuccessMessage("");
      }, 1500);
    }, 500);
  }

  function handleStartEdit(booking) {
    if (!isAdmin && booking.bookedBy !== userName) {
      setError("You can only edit your own bookings");
      return;
    }

    setEditingBooking(booking);
    setEditDate(booking.date);
    const slots = getTimeSlots();
    const startIndex = slots.indexOf(booking.startTime);
    const endIndex = slots.indexOf(booking.endTime);
    const duration = endIndex - startIndex;
    const slotIndices = Array.from({length: duration}, (_, i) => startIndex + i);
    setEditSlots({ [booking.room]: slotIndices });
  }

  function handleSaveEdit() {
    setError("");
    setSuccessMessage("");

    if (!editingBooking) return;

    const roomsWithSlots = Object.keys(editSlots).filter(room => editSlots[room].length > 0);
    if (roomsWithSlots.length === 0) {
      setError("Please select at least one time slot");
      return;
    }

    if (roomsWithSlots.length > 1) {
      setError("You can only edit one room per booking");
      return;
    }

    const room = roomsWithSlots[0];
    const slotIndices = getConsecutiveSlots(room, editSlots[room]);

    if (!slotIndices) {
      setError(`${room}: Please select consecutive time slots only`);
      return;
    }

    const { startTime, endTime } = formatTimeRange(slotIndices[0], slotIndices.length);

    const hasConflict = bookings.some(booking => {
      if (booking.id === editingBooking.id) return false;
      if (booking.room !== room || booking.date !== editDate) return false;
      const slots = getTimeSlots();
      const bookingStartIndex = slots.indexOf(booking.startTime);
      const bookingEndIndex = slots.indexOf(booking.endTime);
      const newStartIndex = slots.indexOf(startTime);
      const newEndIndex = slots.indexOf(endTime);
      return !(newEndIndex <= bookingStartIndex || newStartIndex >= bookingEndIndex);
    });

    if (hasConflict) {
      setError(`${room} is already booked during this time`);
      return;
    }

    const updatedBookings = bookings.map(b => {
      if (b.id === editingBooking.id) {
        return {
          ...b,
          room: room,
          date: editDate,
          startTime: startTime,
          endTime: endTime
        };
      }
      return b;
    }).sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.startTime}`);
      const bTime = new Date(`${b.date}T${b.startTime}`);
      return aTime - bTime;
    });

    setBookings(updatedBookings);
    setEditingBooking(null);
    setEditSlots({});
    setSuccessMessage("Booking updated successfully");
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function handleCancelEdit() {
    setEditingBooking(null);
    setEditSlots({});
    setError("");
  }

  function handleDeleteBooking(booking) {
    if (!isAdmin && booking.bookedBy !== userName) {
      setError("You can only delete your own bookings");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${booking.room} booking on ${formatDateString(booking.date)} from ${booking.startTime} to ${booking.endTime}?`)) {
      return;
    }

    setBookings(bookings.filter(b => b.id !== booking.id));
    setSuccessMessage(`Booking deleted successfully`);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function handleLogout() {
    setUserName("");
    setUserNameInput("");
    setIsAdmin(false);
    setAdminPasswordInput("");
    setShowAdminLogin(false);
    setViewMode("booking");
  }

  // ============= RENDER: LOGIN SCREEN =============
  if (!userName) {
    // Admin Password Screen
    if (showAdminLogin) {
      return (
        <div style={styles.container}>
          <div style={styles.setupCard}>
            <h1 style={styles.brandTitle}>FIRESIDE</h1>
            <p style={styles.brandSubtitle}>Ventures</p>
            <h2 style={styles.setupTitle}>Admin Access</h2>
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              style={styles.input}
              autoFocus
              maxLength="50"
            />
            {error && (
              <div style={styles.errorMessage} role="alert">
                <span style={styles.errorIcon}>⚠</span> {error}
              </div>
            )}
            <button onClick={handleAdminLogin} disabled={!adminPasswordInput.trim()} style={{...styles.primaryButton, opacity: !adminPasswordInput.trim() ? 0.5 : 1, cursor: !adminPasswordInput.trim() ? "not-allowed" : "pointer"}}>
              Enter as Admin
            </button>
            <button onClick={() => { setShowAdminLogin(false); setAdminPasswordInput(""); setError(""); }} style={{...styles.secondaryButton, marginTop: "12px"}}>
              Back
            </button>
          </div>
        </div>
      );
    }

    // Regular Login Screen
    return (
      <div style={styles.container}>
        <div style={styles.setupCard}>
          <h1 style={styles.brandTitle}>FIRESIDE</h1>
          <p style={styles.brandSubtitle}>Ventures</p>
          <h2 style={styles.setupTitle}>Room Booking Hub</h2>
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
          <button onClick={() => { setShowAdminLogin(true); setError(""); }} style={styles.adminLoginButton}>
            Admin Log In
          </button>
        </div>
      </div>
    );
  }

  // ============= RENDER: BOOKING VIEW =============
  if (viewMode === "booking") {
    const timeSlots = getTimeSlots();
    const hasSelectedSlots = Object.keys(selectedSlots).length > 0;

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
            <div style={styles.userBadge}>{isAdmin ? "🔐 Admin" : userName}</div>
            <button onClick={() => setViewMode("viewBookings")} style={styles.viewBookingsButton}>
              View Bookings →
            </button>
            <button onClick={handleLogout} style={styles.switchButton}>Switch</button>
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

          <div style={styles.dateNavigation}>
            <h2 style={styles.dateDisplay}>{formatDateString(selectedDate)}</h2>
            <div style={styles.dateButtonGroup}>
              <button onClick={() => changeDate(-1)} style={styles.dateButton}>
                ← Back
              </button>
              <button onClick={goToToday} style={styles.dateButton}>
                📅 Today
              </button>
              <button onClick={() => changeDate(1)} style={styles.dateButton}>
                Next →
              </button>
              <button onClick={() => setShowDatePicker(!showDatePicker)} style={styles.dateButton}>
                📆 Custom Date
              </button>
            </div>
          </div>

          {showDatePicker && (
            <div style={styles.datePickerContainer}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateInputChange(e.target.value)}
                min={getTodayDateString()}
                style={styles.datePickerInput}
              />
              <button onClick={() => setShowDatePicker(false)} style={styles.datePickerClose}>
                ✕
              </button>
            </div>
          )}

          <div style={styles.gridWrapper}>
            <div style={styles.gridNote}>1 slot = 30 minutes</div>
            <div style={styles.gridContainer}>
              <div style={styles.gridHeader}>
                <div style={styles.timeColumnHeader}>Time</div>
                {ROOMS.map(room => (
                  <div key={room} style={styles.roomColumnHeader}>{room}</div>
                ))}
              </div>

              {timeSlots.map((slot, index) => (
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
              ))}
            </div>
          </div>

          <div style={styles.bookButtonContainer} ref={bookButtonRef}>
            <button
              onClick={handleBookRoom}
              disabled={loading || !hasSelectedSlots}
              style={{
                ...styles.primaryButton,
                opacity: (loading || !hasSelectedSlots) ? 0.6 : 1,
                cursor: (loading || !hasSelectedSlots) ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Booking..." : `Confirm Booking (${Object.values(selectedSlots).reduce((sum, arr) => sum + arr.length, 0)} slots selected)`}
            </button>
          </div>

          {showScrollPrompt && (
            <button onClick={scrollToConfirmButton} style={styles.scrollPrompt}>
              <div style={styles.scrollPromptContent}>
                <div style={styles.scrollArrow}>↓</div>
                <div style={styles.scrollText}>Scroll to confirm booking</div>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============= RENDER: VIEW BOOKINGS =============
  if (viewMode === "viewBookings") {
    const userBookings = isAdmin ? bookings : bookings.filter(b => b.bookedBy === userName);
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
            <div style={styles.userBadge}>{isAdmin ? "🔐 Admin" : userName}</div>
            <button onClick={() => { setViewMode("booking"); setError(""); setSuccessMessage(""); }} style={styles.viewBookingsButton}>
              ← Back to Booking
            </button>
            <button onClick={handleLogout} style={styles.switchButton}>Switch</button>
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

          {editingBooking && (
            <div style={styles.modal}>
              <div style={styles.modalContent}>
                <div style={styles.modalHeader}>
                  <h2 style={{margin: 0}}>Edit Booking</h2>
                  <button onClick={handleCancelEdit} style={styles.modalClose}>✕</button>
                </div>

                {error && (
                  <div style={styles.errorMessage} role="alert">
                    <span style={styles.errorIcon}>⚠</span> {error}
                  </div>
                )}

                <div style={styles.editForm}>
                  <div style={styles.formGroup}>
                    <label style={styles.editLabel}>Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => {
                        const today = getTodayDateString();
                        if (e.target.value >= today) {
                          setEditDate(e.target.value);
                        } else {
                          setError("Please select a valid date");
                        }
                      }}
                      min={getTodayDateString()}
                      style={styles.datePickerInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.editLabel}>Room: {editingBooking.room}</label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.editLabel}>Select Time Slots</label>
                    <div style={styles.editGridContainer}>
                      <div style={styles.editGridHeader}>
                        <div style={styles.timeColumnHeader}>Time</div>
                        <div style={styles.roomColumnHeader}>{editingBooking.room}</div>
                      </div>
                      {getTimeSlots().map((slot, index) => {
                        const isSelected = editSlots[editingBooking.room] && editSlots[editingBooking.room].includes(index);
                        const isBooked = isSlotBookedExcept(editingBooking.room, editDate, index, editingBooking.id);

                        return (
                          <div key={slot} style={styles.editGridRow}>
                            <div style={styles.timeCell}>{slot}</div>
                            <div
                              onClick={() => !isBooked && handleEditSlotClick(editingBooking.room, index)}
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
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.modalButtons}>
                    <button onClick={handleCancelEdit} style={styles.secondaryButton}>Cancel</button>
                    <button onClick={handleSaveEdit} style={styles.primaryButton}>Save Changes</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={styles.bookingsTabs}>
            <h2 style={styles.bookingsTitle}>{isAdmin ? "All Bookings (Admin View)" : "Your Bookings"} <span style={styles.badgeCount}>{userBookings.length}</span></h2>
          </div>

          {userBookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>{isAdmin ? "No bookings yet" : "No bookings yet"}</p>
              <p style={styles.emptyStateHint}>{isAdmin ? "No reservations in the system" : "Go back to booking to create your first reservation"}</p>
            </div>
          ) : (
            <div style={styles.bookingsList}>
              {userBookings.map((booking) => {
                const bookingDate = new Date(booking.date);
                const today = new Date(getTodayDateString());
                const isUpcoming = bookingDate >= today;

                return (
                  <div key={booking.id} style={{...styles.bookingItem, ...(isUpcoming ? styles.bookingItemUpcoming : styles.bookingItemPast)}}>
                    <div style={styles.bookingDetails}>
                      <div style={styles.bookingRoom}>{booking.room}</div>
                      <div style={styles.bookingTime}>{formatDateString(booking.date)} • {booking.startTime} – {booking.endTime}</div>
                      <div style={styles.bookingBy}>Booked by <strong>{booking.bookedBy}</strong></div>
                    </div>
                    <div style={styles.bookingActions}>
                      <button onClick={() => handleStartEdit(booking)} style={styles.editButton} title="Edit this booking">✎</button>
                      <button onClick={() => handleDeleteBooking(booking)} style={styles.cancelButton} title="Delete this booking">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isAdmin && (
            <>
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

                    return (
                      <div key={booking.id} style={{...styles.bookingItem, ...(isUpcoming ? styles.bookingItemUpcoming : styles.bookingItemPast)}}>
                        <div style={styles.bookingDetails}>
                          <div style={styles.bookingRoom}>{booking.room}</div>
                          <div style={styles.bookingTime}>{formatDateString(booking.date)} • {booking.startTime} – {booking.endTime}</div>
                          <div style={styles.bookingBy}>Booked by <strong>{booking.bookedBy}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
    backgroundColor: "white",
    color: "#8B0000",
    borderRadius: "25px",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    border: "2px solid #8B0000",
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
  switchButton: {
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
    justifyContent: "space-between",
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
  },
  dateButtonGroup: {
    display: "flex",
    gap: "10px",
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
  datePickerContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "14px",
    alignItems: "center",
  },
  datePickerInput: {
    padding: "10px 15px",
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
    fontSize: "14px",
    cursor: "pointer",
    flex: 1,
  },
  datePickerClose: {
    padding: "8px 12px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
  },
  gridWrapper: {
    position: "relative",
    marginBottom: "30px",
  },
  gridNote: {
    fontSize: "12px",
    color: "#999",
    marginBottom: "15px",
    textAlign: "right",
    paddingRight: "10px",
  },
  gridContainer: {
    overflowX: "auto",
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
  },
  gridHeader: {
    display: "grid",
    gridTemplateColumns: "100px repeat(5, 1fr)",
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
    gridTemplateColumns: "100px repeat(5, 1fr)",
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
    position: "sticky",
    bottom: 0,
    backgroundColor: "white",
    padding: "20px 0",
    borderTop: "1px solid #e0e0e0",
    zIndex: 100,
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
  secondaryButton: {
    padding: "12px 30px",
    backgroundColor: "transparent",
    color: "#8B0000",
    border: "2px solid #8B0000",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  adminLoginButton: {
    marginTop: "16px",
    padding: "8px 12px",
    backgroundColor: "transparent",
    color: "#8B0000",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textDecoration: "underline",
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
  scrollPrompt: {
    position: "fixed",
    bottom: "100px",
    right: "30px",
    zIndex: 99,
    animation: "slideIn 0.5s ease-out",
    background: "none",
    border: "none",
    padding: "0",
    cursor: "pointer",
  },
  scrollPromptContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#8B0000",
    color: "#FFF",
    padding: "15px 20px",
    borderRadius: "20px",
    boxShadow: "0 4px 15px rgba(139, 0, 0, 0.3)",
    textAlign: "center",
  },
  scrollArrow: {
    fontSize: "24px",
    fontWeight: "700",
    animation: "bounce 1.5s infinite",
  },
  scrollText: {
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
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
  bookingActions: {
    display: "flex",
    gap: "8px",
  },
  editButton: {
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
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "20px",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflow: "auto",
    width: "100%",
    boxShadow: "0 4px 20px rgba(139, 0, 0, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  modalClose: {
    padding: "8px 12px",
    backgroundColor: "transparent",
    color: "#8B0000",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "400",
  },
  editForm: {
    padding: "20px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  editLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#8B0000",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  editGridContainer: {
    border: "1px solid #e0e0e0",
    borderRadius: "14px",
    maxHeight: "400px",
    overflowY: "auto",
  },
  editGridHeader: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: "0",
    backgroundColor: "#8B0000",
    position: "sticky",
    top: 0,
  },
  editGridRow: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: "0",
    borderBottom: "1px solid #e0e0e0",
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #e0e0e0",
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
    marginBottom: "30px",
    color: "#2c2c2c",
  },
  brandSubtitle: {
    fontSize: "18px",
    color: "#9CA3AF",
    marginTop: "4px",
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
    marginBottom: "15px",
    transition: "border-color 0.3s ease",
  },
};

export default RoomBookingSystem;

