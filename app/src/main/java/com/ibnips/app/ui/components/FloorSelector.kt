package com.ibnips.app.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.CampusFloor

@Composable
fun FloorSelector(
    floors: List<CampusFloor>,
    selectedFloorId: String?,
    onFloorSelected: (CampusFloor) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
    ) {
        items(floors) { floor ->
            FilterChip(
                selected = floor.id == selectedFloorId,
                onClick = { onFloorSelected(floor) },
                label = { Text(floor.displayName) },
                modifier = Modifier.padding(end = 8.dp)
            )
        }
    }
}
