import assert from 'node:assert/strict'
import { getSourceRefreshTypes } from './source-refresh'

function testRefreshesOnlyCurrentModeSourceType() {
  assert.deepEqual(getSourceRefreshTypes('fullscreen'), ['screen'])
  assert.deepEqual(getSourceRefreshTypes('region'), ['screen'])
  assert.deepEqual(getSourceRefreshTypes('window'), ['window'])
}

testRefreshesOnlyCurrentModeSourceType()
