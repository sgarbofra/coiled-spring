// Quick test to verify VIX data parsing
const sampleBackendResponse = {
  data: [
    { date: '2025-06-20', close: 20.6200008392334 },
    { date: '2025-06-23', close: 19.83 },
    { date: '2026-06-17', close: 18.440000534057617 }
  ]
}

console.log('Testing VIX data parsing...\n')
console.log('Backend response:', sampleBackendResponse)
console.log('Response.data type:', typeof sampleBackendResponse.data, Array.isArray(sampleBackendResponse.data))
console.log('Response.data length:', sampleBackendResponse.data?.length)

// Simulate frontend parsing
const cleanData = sampleBackendResponse.data
  .map((d) => ({
    date: d.date,
    close: parseFloat(d.close)
  }))
  .filter((d) =>
    d.close != null &&
    !isNaN(Number(d.close)) &&
    isFinite(Number(d.close))
  )

console.log('\nClean data length:', cleanData.length)
console.log('Clean data sample:', cleanData)

if (cleanData.length > 0) {
  console.log('\n✅ Parsing successful!')
  console.log('First point:', cleanData[0])
  console.log('Last point:', cleanData[cleanData.length - 1])
  console.log('Current VIX:', cleanData[cleanData.length - 1].close.toFixed(2))
} else {
  console.log('\n❌ All data filtered out!')
}
