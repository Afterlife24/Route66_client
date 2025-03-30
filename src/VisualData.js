import React, { useEffect, useState, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from "chart.js";
import './VisualData.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const VisualData = ({ orders = [] }) => {
  const [dateFilter, setDateFilter] = useState("Today");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statsData, setStatsData] = useState(null);

  const filterOrdersByDate = useCallback(() => {
    const now = new Date();
    let filtered = orders;

    if (dateFilter === "Today") {
      filtered = orders.filter(
        (order) => order?.createdAt && new Date(order.createdAt).toDateString() === now.toDateString()
      );
    } else if (dateFilter === "Last 3 Days") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(now.getDate() - 3);
      filtered = orders.filter((order) => 
        order?.createdAt && new Date(order.createdAt) >= threeDaysAgo
      );
    } else if (dateFilter === "Last 15 Days") {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(now.getDate() - 15);
      filtered = orders.filter((order) => 
        order?.createdAt && new Date(order.createdAt) >= fifteenDaysAgo
      );
    } else if (dateFilter === "Last Month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filtered = orders.filter((order) => 
        order?.createdAt && new Date(order.createdAt) >= oneMonthAgo
      );
    }

    setFilteredOrders(filtered || []);
  }, [dateFilter, orders]);

  useEffect(() => {
    filterOrdersByDate();
  }, [filterOrdersByDate]);

  // Process data for chart
  const processChartData = useCallback(() => {
    const ordersByDate = filteredOrders.reduce((acc, order) => {
      if (!order?.createdAt) return acc;
      const date = new Date(order.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(ordersByDate),
      datasets: [
        {
          label: 'Number of Orders',
          data: Object.values(ordersByDate),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }, [filteredOrders]);

  const chartData = processChartData();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} orders`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && filteredOrders.length > 0) {
        const index = elements[0].index;
        const selectedDate = chartData.labels[index];
        const count = chartData.datasets[0].data[index];
        
        setStatsData({
          date: selectedDate,
          orders: count,
        });
      }
    }
  };

  const handleShowSummary = () => {
    if (filteredOrders.length === 0) {
      setStatsData({
        totalOrders: 0,
        bestDay: "N/A",
        bestDayOrders: 0,
        isSummary: true
      });
      return;
    }

    const ordersByDate = filteredOrders.reduce((acc, order) => {
      if (!order?.createdAt) return acc;
      const date = new Date(order.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const dates = Object.keys(ordersByDate);
    const bestDay = dates.length > 0 ? dates.reduce((a, b) => 
      ordersByDate[a] > ordersByDate[b] ? a : b
    ) : "N/A";

    setStatsData({
      totalOrders: filteredOrders.length,
      bestDay,
      bestDayOrders: bestDay !== "N/A" ? ordersByDate[bestDay] : 0,
      isSummary: true
    });
  };

  return (
    <div className="visual-data">
      <div className="visual-header">
        <h2>Orders Analytics</h2>
        <div className="filter-controls">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter"
          >
            <option value="Today">Today</option>
            <option value="Last 3 Days">Last 3 Days</option>
            <option value="Last 15 Days">Last 15 Days</option>
            <option value="Last Month">Last Month</option>
          </select>
        </div>
      </div>

      <div className="chart-container">
        {filteredOrders.length > 0 ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <div className="no-data">No orders found for the selected period</div>
        )}
      </div>

      {statsData && (
        <div className="stats-panel">
          {statsData.isSummary ? (
            <>
              <h3>Summary Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total Orders</h4>
                  <p>{statsData.totalOrders}</p>
                </div>
                <div className="stat-card">
                  <h4>Best Day</h4>
                  <p>{statsData.bestDay}</p>
                </div>
                <div className="stat-card">
                  <h4>Orders on Best Day</h4>
                  <p>{statsData.bestDayOrders}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3>Date: {statsData.date}</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Orders</h4>
                  <p>{statsData.orders}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="summary-action">
        <button onClick={handleShowSummary} className="summary-btn">
          Show Summary Statistics
        </button>
      </div>
    </div>
  );
};

export default VisualData;