async function test() {
  try {
    const response = await fetch('http://localhost:5188/api/initial-data', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data: any = await response.json();
    console.log('Courses count:', data.courses?.length || 0);
    console.log('Courses:', data.courses?.map((c: any) => c.title) || []);
  } catch (err) {
    console.error('API Error:', (err as any).message);
  }
}

test();
