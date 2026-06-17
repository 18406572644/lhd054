<script setup lang="ts">
import { ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import dayjs from 'dayjs'

const dateRange = ref<string[]>([
  dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
])
const exporting = ref(false)
const clearing = ref(false)

async function handleExport() {
  if (!window.electronAPI) return
  
  if (!dateRange.value || dateRange.value.length < 2) {
    Message.warning('请选择导出日期范围')
    return
  }
  
  exporting.value = true
  try {
    const result = await window.electronAPI.exportExcel(
      dateRange.value[0],
      dateRange.value[1]
    )
    
    if (result.success) {
      Message.success(`导出成功！文件已保存到：${result.path}`)
    } else if (result.error) {
      Message.error(result.error)
    } else {
      Message.info('已取消导出')
    }
  } catch (error) {
    Message.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    exporting.value = false
  }
}

function handleClearData() {
  Modal.confirm({
    title: '确认清空数据',
    content: '确定要清空所有按键统计数据吗？此操作不可恢复！',
    okText: '确认清空',
    cancelText: '取消',
    okButtonProps: {
      status: 'danger'
    },
    onOk: async () => {
      if (!window.electronAPI) return
      
      clearing.value = true
      try {
        const success = await window.electronAPI.clearData()
        if (success) {
          Message.success('数据已清空')
        } else {
          Message.error('清空失败')
        }
      } catch (error) {
        Message.error('操作失败')
      } finally {
        clearing.value = false
      }
    }
  })
}
</script>

<template>
  <div class="export-panel">
    <div class="export-card">
      <div class="card-icon">📥</div>
      <h3 class="card-title">导出 Excel</h3>
      <p class="card-desc">
        导出按键统计数据为 Excel 文件，包含每日汇总、按键明细和频率排行三个工作表。
      </p>
      
      <div class="form-group">
        <label class="form-label">选择日期范围</label>
        <a-range-picker
          v-model="dateRange"
          style="width: 100%"
          :allow-clear="true"
          format="YYYY-MM-DD"
          :placeholder="['开始日期', '结束日期']"
        />
      </div>
      
      <a-button
        type="primary"
        size="large"
        :loading="exporting"
        @click="handleExport"
        class="export-btn"
      >
        <template #icon><span>📊</span></template>
        {{ exporting ? '导出中...' : '导出 Excel' }}
      </a-button>
    </div>
    
    <div class="export-card danger">
      <div class="card-icon">⚠️</div>
      <h3 class="card-title">危险操作</h3>
      <p class="card-desc">
        清空所有本地存储的按键统计数据。此操作不可恢复，请谨慎操作。
      </p>
      
      <a-button
        status="danger"
        size="large"
        :loading="clearing"
        @click="handleClearData"
        class="clear-btn"
      >
        <template #icon><span>🗑️</span></template>
        {{ clearing ? '清空中...' : '清空所有数据' }}
      </a-button>
    </div>
    
    <div class="info-card">
      <div class="card-icon">💾</div>
      <h3 class="card-title">数据存储</h3>
      <div class="info-list">
      <ul>
        <li>数据存储在本地 SQLite 数据库中</li>
        <li>不会上传到任何服务器</li>
        <li>仅在您的设备上可见</li>
        <li>支持随时导出备份</li>
      </ul>
      </div>
    </div>
    
    <div class="features-card">
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-icon">📈</div>
          <div class="feature-text">
            <div class="feature-title">每日汇总</div>
            <div class="feature-desc">按日期统计按键总数</div>
          </div>
          </div>
        <div class="feature-item">
          <div class="feature-icon">⌨️</div>
          <div class="feature-text">
            <div class="feature-title">按键明细</div>
            <div class="feature-desc">每个按键的详细记录</div>
          </div>
          </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <div class="feature-text">
            <div class="feature-title">频率排行</div>
            <div class="feature-desc">按键使用频率排名</div>
          </div>
          </div>
        <div class="feature-item">
          <div class="feature-icon">⏰</div>
          <div class="feature-text">
            <div class="feature-title">时段分布</div>
            <div class="feature-desc">24小时按键分布</div>
          </div>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 20px;
}

.export-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.export-card:hover {
  border-color: var(--border-hover);
}

.export-card.danger {
  border-color: rgba(239, 68, 68, 0.3);
}

.card-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.card-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.export-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border: none;
}

.export-btn:hover {
  background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
}

.clear-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
}

.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.info-list {
  margin-top: 16px;
}

.info-list ul {
  list-style: none;
  padding: 0;
}

.info-list li {
  position: relative;
  padding-left: 24px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.info-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--success);
  font-weight: bold;
}

.features-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.feature-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 206, 209, 0.05);
  border-radius: 8px;
  transition: all 0.2s;
}

.feature-item:hover {
  background: rgba(0, 206, 209, 0.1);
}

.feature-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 900px) {
  .export-panel {
    grid-template-columns: 1fr;
  }
}
</style>
