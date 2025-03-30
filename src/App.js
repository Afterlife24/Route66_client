import React, { useEffect, useState } from "react";
import "./App.css";
import VisualData from "./VisualData";

const App = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOption, setMenuOption] = useState("All Orders");
  const [dateFilter, setDateFilter] = useState("Today");
  const [timeSelections, setTimeSelections] = useState({});
  const [timeSentStatus, setTimeSentStatus] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`https://route66-server.gofastapi.com/getOrders`);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const data = await response.json();

        if (!data.orders || !Array.isArray(data.orders)) {
          throw new Error('Invalid data structure received from server');
        }

        const sortedOrders = data.orders
          .filter(order => order && order.dishes && Array.isArray(order.dishes))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setOrders(sortedOrders);
        setError("");
      } catch (err) {
        setError(err.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const intervalId = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalId);
  }, [menuOption]);

  const pendingOrdersCount = orders.filter(order => !order.isDelivered).length;

  const filterOrdersByDate = () => {
    const now = new Date();
    let filteredOrders = orders;

    if (dateFilter === "Today") {
      filteredOrders = orders.filter(
        (order) => order.createdAt && 
          new Date(order.createdAt).toDateString() === now.toDateString()
      );
    } else if (dateFilter === "Last 3 Days") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(now.getDate() - 3);
      filteredOrders = orders.filter(
        (order) => order.createdAt && new Date(order.createdAt) >= threeDaysAgo
      );
    } else if (dateFilter === "Last 15 Days") {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(now.getDate() - 15);
      filteredOrders = orders.filter(
        (order) => order.createdAt && new Date(order.createdAt) >= fifteenDaysAgo
      );
    } else if (dateFilter === "Last Month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filteredOrders = orders.filter(
        (order) => order.createdAt && new Date(order.createdAt) >= oneMonthAgo
      );
    }

    return filteredOrders;
  };

  const handleMarkAsDelivered = async (orderId) => {
    try {
      const response = await fetch(`https://route66-server.gofastapi.com/markAsDelivered`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (response.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order && order._id === orderId ? { ...order, isDelivered: true } : order
          )
        );
      } else {
        throw new Error(data.error || "Error marking order as delivered");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendTimeEstimate = async (orderId, email) => {
    try {
      const selectedTime = timeSelections[orderId] || "10";
      const response = await fetch(`https://route66-server.gofastapi.com/timeDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email,
          expectedTime: `${selectedTime} minutes` 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send time estimate");
      }

      setTimeSentStatus(prev => ({
        ...prev,
        [orderId]: `${selectedTime} minutes sent at ${new Date().toLocaleTimeString()}`
      }));

    } catch (err) {
      setError(err.message);
    }
  };

  const renderOrders = () => {
    const filteredOrders = filterOrdersByDate();

    const ordersToRender =
      menuOption === "Pending Orders"
        ? filteredOrders.filter((order) => order && !order.isDelivered)
        : filteredOrders;

    if (!ordersToRender || ordersToRender.length === 0) {
      return <div className="no-orders">No orders found</div>;
    }

    return (
      <div className="order-table-container">
        <table className="order-table">
          <thead>
            <tr>
              <th className="dish-col">Dish</th>
              <th className="qty-col">Qty</th>
              <th className="price-col">Price</th>
              <th className="time-col">Order Time</th>
              <th className="date-col">Order Date</th>
              <th className="email-col">Email</th>
              <th className="token-col">Token</th>
              <th className="status-col">Status</th>
              <th className="estimate-col">Time Estimate</th>
              <th className="sent-col">Time Sent</th>
              <th className="deliver-col">Mark Delivered</th>
              <th className="send-col">Send Time</th>
            </tr>
          </thead>
          <tbody>
            {ordersToRender.map((order) => {
              if (!order || !order.dishes || !Array.isArray(order.dishes)) return null;
              
              const date = order.createdAt ? new Date(order.createdAt) : new Date();
              const isTimeSent = timeSentStatus[order._id];
              
              return (
                <React.Fragment key={order._id || Math.random()}>
                  {order.dishes.map((item, idx) => (
                    <tr 
                      key={`${order._id}-${idx}`}
                      className={hoveredItem === order._id ? 'row-hovered' : ''}
                      onMouseEnter={() => setHoveredItem(order._id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <td className="dish-col">{item?.name || "N/A"}</td>
                      <td className="qty-col">{item?.quantity || 0}</td>
                      <td className="price-col">${item?.price?.toFixed(2) || "0.00"}</td>
                      {idx === 0 && (
                        <>
                          <td className="time-col" rowSpan={order.dishes.length}>
                            {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="date-col" rowSpan={order.dishes.length}>
                            {date.toLocaleDateString()}
                          </td>
                          <td className="email-col" rowSpan={order.dishes.length}>
                            <span className="email-text">{order.email || "N/A"}</span>
                          </td>
                          <td className="token-col" rowSpan={order.dishes.length}>
                            {order.tokenId || "N/A"}
                          </td>
                          <td className="status-col" rowSpan={order.dishes.length}>
                            <span className={`status ${order.isDelivered ? "delivered" : "pending"}`}>
                              {order.isDelivered ? "Delivered" : "Pending"}
                            </span>
                          </td>
                          <td className="estimate-col" rowSpan={order.dishes.length}>
  <div className="time-select-wrapper">
    <select
      value={timeSelections[order._id] || "10"}
      onChange={(e) => setTimeSelections(prev => ({
        ...prev,
        [order._id]: e.target.value
      }))}
      className="time-select"
      disabled={isTimeSent}
    >
      <option value="10">10 minutes</option>
      <option value="20">20 minutes</option>
      <option value="30">30 minutes</option>
    </select>
  </div>
</td>
                          <td className="sent-col" rowSpan={order.dishes.length}>
                            {isTimeSent ? (
                              <span className="time-sent-badge">
                                ✓ Sent
                              </span>
                            ) : (
                              <span className="not-sent">-</span>
                            )}
                          </td>
                          <td className="deliver-col" rowSpan={order.dishes.length}>
                            {!order.isDelivered && (
                              <button
                                className="action-button mark-delivered"
                                onClick={() => handleMarkAsDelivered(order._id)}
                              >
                                Mark Delivered
                              </button>
                            )}
                          </td>
                          <td className="send-col" rowSpan={order.dishes.length}>
                            {!order.isDelivered && (
                              <button
                                className={`action-button send-time ${isTimeSent ? "disabled" : ""}`}
                                onClick={() => !isTimeSent && handleSendTimeEstimate(order._id, order.email)}
                                disabled={isTimeSent}
                              >
                                {isTimeSent ? "Sent" : "Send Time"}
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Order Dashboard</h2>
        </div>
        <ul className="menu-list">
          {["All Orders", "Pending Orders", "Visual Data"].map((item) => (
            <li
              key={item}
              className={`menu-item ${menuOption === item ? "active" : ""}`}
              onClick={() => setMenuOption(item)}
            >
              <span className="menu-icon">
                {item === "All Orders" ? "📦" : 
                 item === "Pending Orders" ? "⏳" : 
                 item === "Visual Data" ? "📊" : "📋"}
              </span>
              <span className="menu-text">
                {item}
                {(item === "All Orders" || item === "Pending Orders") && pendingOrdersCount > 0 && (
                  <span className="menu-badge">
                    {pendingOrdersCount}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="date-filters">
          <h3>Filter by Date</h3>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-select"
          >
            <option value="Today">Today</option>
            <option value="Last 3 Days">Last 3 Days</option>
            <option value="Last 15 Days">Last 15 Days</option>
            <option value="Last Month">Last Month</option>
          </select>
        </div>
      </div>
      <div className="main-content">
        <div className="content-header">
          <h1>{menuOption}</h1>
          <div className="summary-info">
            Showing {filterOrdersByDate().length} orders
            {menuOption === "Pending Orders" && ` (${pendingOrdersCount} pending)`}
          </div>
        </div>
        <div className="order-details">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <p className="error-text">{error}</p>
            </div>
          ) : menuOption === "Visual Data" ? (
            <VisualData orders={orders} />
          ) : (
            renderOrders()
          )}
        </div>
      </div>
    </div>
  );
};

export default App;