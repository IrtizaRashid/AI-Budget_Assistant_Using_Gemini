// Reusable pie chart (react-chartjs-2 + Chart.js).
// Chart.js is tree-shakeable, so we must register the pieces we use.
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { formatPKR } from '../../utils/format.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Props:
//   labels : ['Food', 'Transport', ...]
//   data   : [15000, 7500, ...]
//   colors : ['#6366f1', ...]
export default function PieChart({ labels, data, colors }) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderColor: '#130d1d',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // lets the fixed-height container control size
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, color: '#cbd5e1' },
      },
      tooltip: {
        callbacks: {
          // Show "Food: PKR 15,000" in tooltips.
          label: (ctx) => `${ctx.label}: ${formatPKR(ctx.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
}
