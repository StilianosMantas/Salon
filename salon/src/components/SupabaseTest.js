'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SupabaseTest() {
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function testConnection() {
    setLoading(true)
    setTestResult(null)
    
    try {
      console.log('Testing Supabase connection...')
      
      // Test basic connection
      const { data: healthCheck, error: healthError } = await supabase
        .from('business')
        .select('count', { count: 'exact', head: true })
      
      if (healthError) {
        setTestResult({
          success: false,
          message: `Connection failed: ${healthError.message}`,
          details: healthError
        })
        return
      }
      
      // Test actual data fetch
      const { data, error } = await supabase
        .from('business')
        .select('id, name')
        .limit(5)
      
      setTestResult({
        success: !error,
        message: error ? `Data fetch failed: ${error.message}` : `Success! Found ${data?.length || 0} businesses`,
        details: { error, data, count: healthCheck?.count }
      })
      
    } catch (err) {
      setTestResult({
        success: false,
        message: `Unexpected error: ${err.message}`,
        details: err
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="box">
      <h3 className="title is-5">Supabase Connection Test</h3>
      
      <button 
        className={`button is-info ${loading ? 'is-loading' : ''}`}
        onClick={testConnection}
        disabled={loading}
      >
        Test Connection
      </button>
      
      {testResult && (
        <div className={`notification mt-4 ${testResult.success ? 'is-success' : 'is-danger'}`}>
          <p><strong>Result:</strong> {testResult.message}</p>
          {testResult.details && (
            <details className="mt-2">
              <summary>Technical Details</summary>
              <pre className="mt-2" style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}