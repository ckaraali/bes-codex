import { Buffer } from "node:buffer";

interface SavingsChartInput {
  labels: string[];
  values: number[];
  color?: string;
  apiUrl?: string;
}

const DEFAULT_COLOR = "#2563eb";
const DEFAULT_API_URL = process.env.QUICKCHART_URL ?? "http://localhost:3400/chart";

/**
 * Generates a base64 encoded PNG line chart for savings progression using a QuickChart-compatible server.
 * Returns null if the chart service is unreachable or responds with a non-OK status.
 */
export async function generateSavingsLineChart({
  labels,
  values,
  color = DEFAULT_COLOR,
  apiUrl = DEFAULT_API_URL
}: SavingsChartInput): Promise<string | null> {
  if (labels.length !== values.length || labels.length === 0) {
    return null;
  }

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Birikim",
          data: values,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: color,
          pointHoverRadius: 7,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: {
              size: 14,
              family: "Arial, sans-serif"
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 13,
              family: "Arial, sans-serif"
            }
          }
        },
        y: {
          ticks: {
            font: {
              size: 13,
              family: "Arial, sans-serif"
            }
          }
        }
      }
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        width: 700,
        height: 320,
        format: "png",
        devicePixelRatio: 2,
        chart: config
      })
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("QuickChart request failed", error);
    return null;
  }
}
