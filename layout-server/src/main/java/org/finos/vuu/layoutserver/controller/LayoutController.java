package org.finos.vuu.layoutserver.controller;

import lombok.RequiredArgsConstructor;
import org.finos.vuu.layoutserver.dto.request.LayoutRequestDto;
import org.finos.vuu.layoutserver.dto.response.LayoutResponseDto;
import org.finos.vuu.layoutserver.dto.response.MetadataResponseDto;
import org.finos.vuu.layoutserver.model.Layout;
import org.finos.vuu.layoutserver.service.LayoutService;
import org.finos.vuu.layoutserver.service.MetadataService;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/layouts")
@Validated
public class LayoutController {

    private final LayoutService layoutService;
    private final MetadataService metadataService;
    private final ModelMapper mapper;

    /**
     * Gets the specified layout
     *
     * @param id ID of the layout to get
     * @return the layout
     */
    @ResponseStatus(HttpStatus.OK)
    @GetMapping("/{id}")
    public LayoutResponseDto getLayout(@PathVariable UUID id) {
        return mapper.map(layoutService.getLayout(id), LayoutResponseDto.class);
    }

    /**
     * Gets metadata for all layouts
     *
     * @return the metadata
     */
    @ResponseStatus(HttpStatus.OK)
    @GetMapping("/metadata")
    public List<MetadataResponseDto> getMetadata() {

        return metadataService.getMetadata()
                .stream()
                .map(metadata -> mapper.map(metadata, MetadataResponseDto.class))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Creates a new layout
     *
     * @param layoutToCreate the layout to be created
     * @return the layout that has been created, with the autogenerated ID and created date
     */
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping
    public LayoutResponseDto createLayout(@RequestBody @Valid LayoutRequestDto layoutToCreate) {
        Layout layout = mapper.map(layoutToCreate, Layout.class);

        return mapper.map(layoutService.createLayout(layout), LayoutResponseDto.class);
    }

    /**
     * Updates the specified layout
     *
     * @param id     ID of the layout to update
     * @param layout the new layout
     */
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PutMapping("/{id}")
    public void updateLayout(@PathVariable UUID id, @RequestBody @Valid LayoutRequestDto layout) {
        Layout newLayout = mapper.map(layout, Layout.class);

        layoutService.updateLayout(id, newLayout);
    }

    /**
     * Deletes the specified layout
     *
     * @param id ID of the layout to delete
     */
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping("/{id}")
    public void deleteLayout(@PathVariable UUID id) {
        layoutService.deleteLayout(id);
    }
}
