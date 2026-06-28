// Reusable grouped bar chart (react-chartjs-2 + Chart.js).
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { formatPKR } from '../../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Props:
//   labels   : ['Food', 'Transport', ...]
//   datasets : [{ label, data, backgroundColor }, ...]
export default function BarChart({ labels, datasets }) {
  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatPKR(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Compact axis labels, e.g. 15000 -> "15,000".
          callback: (value) => Number(value).toLocaleString(),
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Bar data={chartData} options={options} />
    </div>
  );
}
