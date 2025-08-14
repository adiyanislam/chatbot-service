// scripts/analyze.ts
import { Pool as AnalysisPool } from 'pg'; // Use alias to avoid name conflict

const analysisPool = new AnalysisPool({
  host: 'localhost', port: 5433, user: 'myuser', password: 'mypassword', database: 'dija_ai_db',
});

const analyzeResults = async () => {
  const modelToAnalyze = 'phi3';
  console.log(`Analyzing results for model: ${modelToAnalyze}`);

  try {
    const result = await analysisPool.query(
      'SELECT response_time_ms, is_accurate, test_type FROM evaluation_results WHERE model_name = $1',
      [modelToAnalyze]
    );

    if (result.rows.length === 0) {
      console.log('No results found for this model.');
      return;
    }

    const totalRuns = result.rows.length;
    const factualRuns = result.rows.filter(r => r.test_type === 'factual');
    const adversarialRuns = result.rows.filter(r => r.test_type === 'adversarial');

    const calculateMetrics = (runs: any[]) => {
        if (runs.length === 0) return { accuracy: 0, avgTime: 0 };
        const avgTime = runs.reduce((sum, run) => sum + run.response_time_ms, 0) / runs.length;
        const accuracy = (runs.filter(r => r.is_accurate).length / runs.length) * 100;
        return { accuracy, avgTime };
    };

    const overallMetrics = calculateMetrics(result.rows);
    const factualMetrics = calculateMetrics(factualRuns);
    const adversarialMetrics = calculateMetrics(adversarialRuns);

    console.log(`\n--- Evaluation Analysis for ${modelToAnalyze} ---`);
    console.log(`Total test runs: ${totalRuns}`);
    console.log(`Average response time (Overall): ${overallMetrics.avgTime.toFixed(2)}ms`);
    console.log(`Accuracy (Overall): ${overallMetrics.accuracy.toFixed(2)}%`);
    console.log('--------------------------------------');
    console.log(`Factual Tests (${factualRuns.length} runs):`);
    console.log(`  - Accuracy: ${factualMetrics.accuracy.toFixed(2)}%`);
    console.log(`  - Avg Time: ${factualMetrics.avgTime.toFixed(2)}ms`);
    console.log('--------------------------------------');
    console.log(`Adversarial Tests (${adversarialRuns.length} runs):`);
    console.log(`  - Accuracy: ${adversarialMetrics.accuracy.toFixed(2)}%`);
    console.log(`  - Avg Time: ${adversarialMetrics.avgTime.toFixed(2)}ms`);
    console.log('--------------------------------------\n');

  } catch (error) {
    console.error('An error occurred during analysis:', error);
  } finally {
    await analysisPool.end();
    process.exit(0);
  }
};

analyzeResults();
